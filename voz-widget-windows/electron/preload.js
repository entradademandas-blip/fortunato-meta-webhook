const { contextBridge, ipcRenderer } = require('electron');

// Sandboxed preload scripts can't require() local files (only Electron/Node
// built-ins) — os nomes de canal são copiados aqui, precisam bater com
// ipc-channels.js.
const channels = {
  MIC_TRANSCRIBE: 'mic:transcribe',
  MASTER_CONTROLLER_SEND: 'masterController:send',
  TTS_SPEAK: 'tts:speak',
  LOG_CLIENT_ERROR: 'log:clientError',
  WIDGET_SHOWN: 'widget:shown',
  WIDGET_HIDE: 'widget:hide'
};

contextBridge.exposeInMainWorld('api', {
  transcribe: (audioBuffer, mimeType) =>
    ipcRenderer.invoke(channels.MIC_TRANSCRIBE, { audioBuffer, mimeType }),

  sendToMasterController: (text) =>
    ipcRenderer.invoke(channels.MASTER_CONTROLLER_SEND, { text }),

  speak: (text) =>
    ipcRenderer.invoke(channels.TTS_SPEAK, { text }),

  logClientError: (scope, message) =>
    ipcRenderer.invoke(channels.LOG_CLIENT_ERROR, { scope, message }),

  onShown: (callback) =>
    ipcRenderer.on(channels.WIDGET_SHOWN, () => callback()),

  hide: () =>
    ipcRenderer.send(channels.WIDGET_HIDE)
});
