import { describe, expect, it, vi } from 'vitest';
import {
  checkMessage,
  IpcRouter,
  type IpcMainLike,
  type Sender,
  type SenderRegistry,
} from '../../../src/main/ipc/handle.ts';
import { CHANNEL, LIMITS } from '../../../src/shared/ipc.ts';
import type { WindowRole } from '../../../src/shared/windows.ts';

const URLS: Record<WindowRole, string> = {
  stage: 'app://renderer/stage/index.html',
  chat: 'app://renderer/chat/index.html',
  settings: 'app://renderer/settings/index.html',
};
const ID_OF: Record<WindowRole, number> = { stage: 1, chat: 2, settings: 3 };
const registry: SenderRegistry = {
  roleOf: (id) => (Object.keys(ID_OF) as WindowRole[]).find((role) => ID_OF[role] === id),
  expectedUrl: (role) => URLS[role],
};

const from = (role: WindowRole, overrides: Partial<Sender> = {}): Sender => ({
  webContentsId: ID_OF[role],
  frameUrl: URLS[role],
  isMainFrame: true,
  ...overrides,
});

describe('checkMessage', () => {
  it.each(['stage', 'chat', 'settings'] as const)('accepts a valid ping from %s', (role) => {
    expect(checkMessage(CHANNEL.ping, from(role), { nonce: 'n-1' }, registry)).toEqual({
      ok: true,
      data: { nonce: 'n-1' },
      role,
    });
  });

  it('ignores the query and hash of the sender URL', () => {
    const sender = from('stage', { frameUrl: `${URLS.stage}?x=1#y` });
    expect(checkMessage(CHANNEL.stageHit, sender, { overOpaque: true }, registry).ok).toBe(true);
  });

  it.each([
    ['an extra field', { nonce: 'n', extra: 1 }],
    ['a nonce over the limit', { nonce: 'x'.repeat(LIMITS.pingNonceMax + 1) }],
    ['an empty nonce', { nonce: '' }],
    ['a wrong type', { nonce: 42 }],
    ['no payload', undefined],
  ])('rejects a ping with %s as invalid', (_label, payload) => {
    expect(checkMessage(CHANNEL.ping, from('chat'), payload, registry)).toEqual({ ok: false, code: 'invalid' });
  });

  it('rejects an unknown channel as invalid', () => {
    expect(checkMessage('app:exec', from('stage'), {}, registry)).toEqual({ ok: false, code: 'invalid' });
    expect(checkMessage('__proto__', from('stage'), {}, registry)).toEqual({ ok: false, code: 'invalid' });
  });

  it.each([
    ['a window not allowed on the channel', CHANNEL.stageHit, from('chat')],
    ['an unknown web contents', CHANNEL.ping, from('stage', { webContentsId: 99 })],
    ['a foreign page in a known window', CHANNEL.ping, from('stage', { frameUrl: 'https://evil.example/' })],
    ['the page of another window', CHANNEL.ping, from('stage', { frameUrl: URLS.chat })],
    ['a sub-frame', CHANNEL.ping, from('stage', { isMainFrame: false })],
    ['a destroyed frame', CHANNEL.ping, from('stage', { frameUrl: undefined })],
  ])('rejects %s as forbidden', (_label, channel, sender) => {
    const payload = channel === CHANNEL.stageHit ? { overOpaque: true } : { nonce: 'n' };
    expect(checkMessage(channel, sender, payload, registry)).toEqual({ ok: false, code: 'forbidden' });
  });

  it('checks the sender before parsing (a forbidden sender learns nothing about the schema)', () => {
    expect(checkMessage(CHANNEL.stageInput, from('settings'), { bogus: true }, registry)).toEqual({
      ok: false,
      code: 'forbidden',
    });
  });

  it('accepts only the declared stage input kinds', () => {
    expect(checkMessage(CHANNEL.stageInput, from('stage'), { kind: 'drag-start' }, registry).ok).toBe(true);
    expect(checkMessage(CHANNEL.stageInput, from('stage'), { kind: 'drop-table' }, registry)).toEqual({
      ok: false,
      code: 'invalid',
    });
  });
});

type InvokeListener = (event: unknown, payload: unknown) => Promise<unknown>;
type SendListener = (event: unknown, payload: unknown) => void;

function fakeIpcMain() {
  const invoke = new Map<string, InvokeListener>();
  const send = new Map<string, SendListener>();
  const ipcMain = {
    handle: (channel: string, listener: InvokeListener) => invoke.set(channel, listener),
    on: (channel: string, listener: SendListener) => send.set(channel, listener),
    removeHandler: (channel: string) => invoke.delete(channel),
    removeAllListeners: (channel: string) => send.delete(channel),
  };
  // Electron-shaped event from a sender.
  const event = (sender: Sender) => ({
    sender: { id: sender.webContentsId },
    senderFrame:
      sender.frameUrl === undefined ? null : { url: sender.frameUrl, parent: sender.isMainFrame ? null : {} },
  });
  // The fake implements only what IpcRouter calls; Electron's IpcMain overloads and event types are much wider.
  return { ipcMain: ipcMain as unknown as IpcMainLike, invoke, send, event };
}

describe('IpcRouter', () => {
  it('round-trips a valid invoke and returns typed errors otherwise', async () => {
    const fake = fakeIpcMain();
    const router = new IpcRouter(fake.ipcMain, registry);
    router.handle(CHANNEL.ping, ({ nonce }) => ({ nonce, version: '0.0.0' }));
    const call = fake.invoke.get(CHANNEL.ping);

    expect(await call?.(fake.event(from('chat')), { nonce: 'abc' })).toEqual({
      ok: true,
      data: { nonce: 'abc', version: '0.0.0' },
    });
    expect(await call?.(fake.event(from('chat')), { nonce: 'abc', x: 1 })).toEqual({ ok: false, code: 'invalid' });
    expect(await call?.(fake.event(from('chat', { webContentsId: 7 })), { nonce: 'abc' })).toEqual({
      ok: false,
      code: 'forbidden',
    });
  });

  it('turns a throwing handler or an off-contract response into internal, without the stack', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fake = fakeIpcMain();
    new IpcRouter(fake.ipcMain, registry).handle(CHANNEL.ping, () => {
      throw new Error('secret detail');
    });
    const result = await fake.invoke.get(CHANNEL.ping)?.(fake.event(from('stage')), { nonce: 'n' });
    expect(result).toEqual({ ok: false, code: 'internal' });
    expect(JSON.stringify(result)).not.toContain('secret');

    const fake2 = fakeIpcMain();
    new IpcRouter(fake2.ipcMain, registry).handle(CHANNEL.ping, () => ({ nonce: 'n', version: 'v'.repeat(100) }));
    expect(await fake2.invoke.get(CHANNEL.ping)?.(fake2.event(from('stage')), { nonce: 'n' })).toEqual({
      ok: false,
      code: 'internal',
    });
  });

  it('delivers valid send messages and drops the rest', () => {
    const fake = fakeIpcMain();
    const router = new IpcRouter(fake.ipcMain, registry);
    const received: unknown[] = [];
    router.on(CHANNEL.stageHit, (request, role) => received.push([request, role]));
    const deliver = fake.send.get(CHANNEL.stageHit);

    deliver?.(fake.event(from('stage')), { overOpaque: true });
    deliver?.(fake.event(from('chat')), { overOpaque: true });
    deliver?.(fake.event(from('stage')), { overOpaque: 'yes' });
    expect(received).toEqual([[{ overOpaque: true }, 'stage']]);
  });

  it('refuses double registration and removes everything on dispose', () => {
    const fake = fakeIpcMain();
    const router = new IpcRouter(fake.ipcMain, registry);
    router.handle(CHANNEL.ping, ({ nonce }) => ({ nonce, version: '1' }));
    router.on(CHANNEL.stageInput, () => undefined);
    expect(() => {
      router.on(CHANNEL.stageInput, () => undefined);
    }).toThrow(/already registered/);

    router.dispose();
    expect(fake.invoke.size).toBe(0);
    expect(fake.send.size).toBe(0);
  });
});
