// IPC entry point in main (rules/ipc.md, plan M0-04): every message is sender-checked and zod-validated against
// the registry in src/shared/ipc.ts before a handler runs. Errors leave as `{ ok: false, code }`, never as stacks.
import type { IpcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';
import {
  IPC,
  isChannelName,
  type InvokeChannelName,
  type IpcResult,
  type RequestOf,
  type ResponseOf,
  type SendChannelName,
  type EventChannelName,
  type PayloadOf,
} from '../../shared/ipc.ts';
import type { WindowRole } from '../../shared/windows.ts';

/** Who sent a message, as main sees it (from the Electron event). */
export interface Sender {
  readonly webContentsId: number;
  /** `event.senderFrame?.url`; undefined when the frame is gone. */
  readonly frameUrl: string | undefined;
  /** `event.senderFrame` is the top-level frame of its web contents. */
  readonly isMainFrame: boolean;
}

/** Which window owns a web contents id, and which page URL that window must be showing. */
export interface SenderRegistry {
  roleOf(webContentsId: number): WindowRole | undefined;
  expectedUrl(role: WindowRole): string;
}

export type Checked<T> =
  { readonly ok: true; readonly data: T; readonly role: WindowRole } | Extract<IpcResult<never>, { ok: false }>;

function stripQueryAndHash(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return undefined;
  }
}

/** Sender check + schema parse. Pure: no Electron objects, so it is unit-tested directly. */
export function checkMessage(
  channel: string,
  sender: Sender,
  payload: unknown,
  registry: SenderRegistry,
): Checked<unknown> {
  if (!isChannelName(channel)) return { ok: false, code: 'invalid' };
  const def = IPC[channel];
  // Event channels flow main → renderer only; a renderer sending on one is rejected.
  if (def.kind === 'event') return { ok: false, code: 'forbidden' };
  const allowed: readonly WindowRole[] = def.windows;
  const role = registry.roleOf(sender.webContentsId);
  if (role === undefined || !allowed.includes(role) || !sender.isMainFrame || sender.frameUrl === undefined) {
    return { ok: false, code: 'forbidden' };
  }
  if (stripQueryAndHash(sender.frameUrl) !== registry.expectedUrl(role)) return { ok: false, code: 'forbidden' };
  const parsed = def.request.safeParse(payload);
  if (!parsed.success) return { ok: false, code: 'invalid' };
  return { ok: true, data: parsed.data, role };
}

function senderOf(event: IpcMainEvent | IpcMainInvokeEvent): Sender {
  const frame = event.senderFrame;
  return {
    webContentsId: event.sender.id,
    frameUrl: frame?.url,
    isMainFrame: frame !== null && frame.parent === null,
  };
}

export type InvokeHandler<K extends InvokeChannelName> = (
  request: RequestOf<K>,
  role: WindowRole,
) => ResponseOf<K> | Promise<ResponseOf<K>>;
export type SendHandler<K extends SendChannelName> = (request: RequestOf<K>, role: WindowRole) => void;

/** Structural slice of `ipcMain` (lets tests drive the wiring with a fake). */
export type IpcMainLike = Pick<IpcMain, 'handle' | 'on' | 'removeHandler' | 'removeAllListeners'>;

export class IpcRouter {
  readonly #ipcMain: IpcMainLike;
  readonly #registry: SenderRegistry;
  readonly #registered = new Set<string>();

  constructor(ipcMain: IpcMainLike, registry: SenderRegistry) {
    this.#ipcMain = ipcMain;
    this.#registry = registry;
  }

  handle<K extends InvokeChannelName>(channel: K, handler: InvokeHandler<K>): void {
    this.#claim(channel);
    const def = IPC[channel];
    this.#ipcMain.handle(channel, async (event, payload: unknown): Promise<IpcResult<ResponseOf<K>>> => {
      const checked = checkMessage(channel, senderOf(event), payload, this.#registry);
      if (!checked.ok) return checked;
      try {
        // checkMessage parsed `payload` with IPC[channel].request, so the data has this channel's request type.
        const response = await handler(checked.data as RequestOf<K>, checked.role);
        const valid = def.response.safeParse(response);
        if (!valid.success) {
          console.error(`[ipc] ${channel}: handler returned a response outside the contract`);
          return { ok: false, code: 'internal' };
        }
        return { ok: true, data: valid.data as ResponseOf<K> };
      } catch (error: unknown) {
        console.error(`[ipc] ${channel}: handler failed`, error);
        return { ok: false, code: 'internal' };
      }
    });
  }

  on<K extends SendChannelName>(channel: K, handler: SendHandler<K>): void {
    this.#claim(channel);
    this.#ipcMain.on(channel, (event, payload: unknown) => {
      const checked = checkMessage(channel, senderOf(event), payload, this.#registry);
      if (!checked.ok) return; // fire-and-forget: a rejected message is dropped
      try {
        // Parsed with IPC[channel].request above.
        handler(checked.data as RequestOf<K>, checked.role);
      } catch (error: unknown) {
        console.error(`[ipc] ${channel}: handler failed`, error);
      }
    });
  }

  /** Removes every handler and listener this router added (called on quit). */
  dispose(): void {
    for (const channel of this.#registered) {
      if (isChannelName(channel) && IPC[channel].kind === 'invoke') this.#ipcMain.removeHandler(channel);
      else this.#ipcMain.removeAllListeners(channel);
    }
    this.#registered.clear();
  }

  #claim(channel: string): void {
    if (this.#registered.has(channel)) throw new Error(`[ipc] ${channel} is already registered`);
    this.#registered.add(channel);
  }
}

/** Main → renderer push, validated against the contract first (main does not trust its own callers either). */
export function sendEvent<K extends EventChannelName>(
  target: Pick<WebContents, 'send' | 'isDestroyed'>,
  channel: K,
  payload: PayloadOf<K>,
): boolean {
  if (target.isDestroyed() || !IPC[channel].payload.safeParse(payload).success) return false;
  target.send(channel, payload);
  return true;
}
