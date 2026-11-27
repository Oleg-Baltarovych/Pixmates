// Stage preload (sandboxed, CommonJS bundle): one named function per channel, never ipcRenderer (rules/ipc.md).
import { contextBridge, ipcRenderer } from 'electron';
import type { PixmatesApi } from '../shared/ipc.ts';
import { CHANNEL } from '../shared/ipc-channels.ts';

const api: PixmatesApi = {
  ping: (nonce) => ipcRenderer.invoke(CHANNEL.ping, { nonce }),
  stage: {
    reportHit: (overOpaque) => {
      ipcRenderer.send(CHANNEL.stageHit, { overOpaque });
    },
    sendInput: (kind) => {
      ipcRenderer.send(CHANNEL.stageInput, { kind });
    },
    onCharacters: (listener) => {
      // Only the payload reaches the page, never the IpcRendererEvent (it carries the sender object).
      const handler = (_event: unknown, payload: Parameters<typeof listener>[0]): void => {
        listener(payload);
      };
      ipcRenderer.on(CHANNEL.stageCharacters, handler);
      return () => {
        ipcRenderer.removeListener(CHANNEL.stageCharacters, handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('pixmates', api);
