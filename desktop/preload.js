const { contextBridge, ipcRenderer } = require('electron');

// Minimal, explicit bridge for the activation window only.
contextBridge.exposeInMainWorld('maishaa', {
  activate: (key) => ipcRenderer.invoke('license:activate', key),
  close: () => ipcRenderer.invoke('license:close'),
});
