// Every IPC channel, declared once (SPEC §3.2, rules/ipc.md, plan M0-04): name, direction, zod schemas with size
// bounds, and the windows allowed to use it. Main validates every payload and sender against this registry;
// preloads expose one named function per channel. Names come from ./ipc-channels.ts (zod-free, for the preloads);
// IPC is keyed by them, so every name has exactly one contract.
import { z } from 'zod';
import { CHANNEL } from './ipc-channels.ts';
import type { WindowRole } from './windows.ts';

export { CHANNEL };

export const LIMITS = {
  /** `app:ping` nonce: an opaque correlation string chosen by the renderer. */
  pingNonceMax: 64,
  versionMax: 32,
  /** Upper bound for the integer sprite scale: a sanity cap far above any real clamp (main limits the sprite to
   * MAX_HEIGHT_FRACTION of the work area for whatever FRAME_HEIGHT_PX the art uses). */
  scaleMax: 32,
} as const;

interface InvokeChannel<Req extends z.ZodType, Res extends z.ZodType> {
  readonly kind: 'invoke';
  readonly request: Req;
  readonly response: Res;
  readonly windows: readonly WindowRole[];
}

/** Main → renderer push. Main parses its own payload before sending. */
interface EventChannel<Payload extends z.ZodType> {
  readonly kind: 'event';
  readonly payload: Payload;
  readonly windows: readonly WindowRole[];
}

interface SendChannel<Req extends z.ZodType> {
  readonly kind: 'send';
  readonly request: Req;
  readonly windows: readonly WindowRole[];
}

export const IPC = {
  /** Health check from any window: echoes the nonce with the app version. */
  [CHANNEL.ping]: {
    kind: 'invoke',
    request: z.object({ nonce: z.string().min(1).max(LIMITS.pingNonceMax) }).strict(),
    response: z
      .object({ nonce: z.string().max(LIMITS.pingNonceMax), version: z.string().max(LIMITS.versionMax) })
      .strict(),
    windows: ['stage', 'chat', 'settings'],
  },
  /** Stage alpha hit-test result: is the cursor over an opaque pixel of the character? (click-through) */
  [CHANNEL.stageHit]: {
    kind: 'send',
    request: z.object({ overOpaque: z.boolean() }).strict(),
    windows: ['stage'],
  },
  /** Pointer input on the character. Positions stay in the renderer in M0; core gets the drag state. */
  [CHANNEL.stageInput]: {
    kind: 'send',
    request: z.object({ kind: z.enum(['drag-start', 'drag-end', 'click']) }).strict(),
    windows: ['stage'],
  },
  /** Integer sprite scale chosen by main (size preset / fine steps, display metrics). */
  [CHANNEL.stageScale]: {
    kind: 'event',
    payload: z.object({ scale: z.int().min(1).max(LIMITS.scaleMax) }).strict(),
    windows: ['stage'],
  },
} as const satisfies Record<
  string,
  InvokeChannel<z.ZodType, z.ZodType> | SendChannel<z.ZodType> | EventChannel<z.ZodType>
>;

export type ChannelName = keyof typeof IPC;
export type InvokeChannelName = {
  [K in ChannelName]: (typeof IPC)[K]['kind'] extends 'invoke' ? K : never;
}[ChannelName];
export type SendChannelName = {
  [K in ChannelName]: (typeof IPC)[K]['kind'] extends 'send' ? K : never;
}[ChannelName];
export type EventChannelName = {
  [K in ChannelName]: (typeof IPC)[K]['kind'] extends 'event' ? K : never;
}[ChannelName];
export type PayloadOf<K extends EventChannelName> = z.infer<(typeof IPC)[K]['payload']>;

export type RequestOf<K extends InvokeChannelName | SendChannelName> = z.infer<(typeof IPC)[K]['request']>;
export type ResponseOf<K extends InvokeChannelName> = z.infer<(typeof IPC)[K]['response']>;

export const IPC_ERROR_CODES = ['invalid', 'forbidden', 'internal'] as const;
export type IpcErrorCode = (typeof IPC_ERROR_CODES)[number];

/** What crosses the boundary for every invoke: data or a code, never a stack trace. */
export type IpcResult<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly code: IpcErrorCode };

export function isChannelName(name: string): name is ChannelName {
  return Object.hasOwn(IPC, name);
}

/** The API each preload exposes as `window.pixmates`. `stage` exists only in the stage window. */
export interface PixmatesApi {
  ping(nonce: string): Promise<IpcResult<ResponseOf<'app:ping'>>>;
  readonly stage?: {
    reportHit(overOpaque: boolean): void;
    sendInput(kind: RequestOf<'stage:input'>['kind']): void;
    /** Subscribes to scale changes; returns an unsubscribe function. */
    onScale(listener: (payload: PayloadOf<'stage:scale'>) => void): () => void;
  };
}
