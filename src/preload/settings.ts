// Settings preload (sandboxed, CommonJS bundle): one named function per channel, never ipcRenderer (rules/ipc.md).
import { contextBridge, ipcRenderer } from 'electron';
import type { PixmatesApi } from '../shared/ipc.ts';
import { CHANNEL } from '../shared/ipc-channels.ts';

const api: PixmatesApi = {
  ping: (nonce) => ipcRenderer.invoke(CHANNEL.ping, { nonce }),
};

contextBridge.exposeInMainWorld('pixmates', api);
