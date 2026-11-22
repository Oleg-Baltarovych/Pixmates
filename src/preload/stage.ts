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
    onScale: (listener) => {
      // Only the payload reaches the page, never the IpcRendererEvent (it carries the sender object).
      const handler = (_event: unknown, payload: { scale: number }): void => {
        listener({ scale: payload.scale });
      };
      ipcRenderer.on(CHANNEL.stageScale, handler);
      return () => {
        ipcRenderer.removeListener(CHANNEL.stageScale, handler);
      };
    },
  },
};

contextBridge.exposeInMainWorld('pixmates', api);
