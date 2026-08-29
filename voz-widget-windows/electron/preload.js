const { contextBridge, ipcRenderer } = require('electron');
const channels = require('./ipc-channels');

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
    ipcRenderer.on(channels.WIDGET_SHOWN, () => callback())
});
