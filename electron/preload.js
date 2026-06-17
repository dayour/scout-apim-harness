const { contextBridge, ipcRenderer } = require('electron');

// Expose relay API to renderer
contextBridge.exposeInMainWorld('apimAPI', {
  relay: {
    connect: () => ipcRenderer.invoke('relay:connect'),
    disconnect: () => ipcRenderer.invoke('relay:disconnect'),
    getStatus: () => ipcRenderer.invoke('relay:status'),
    onStatusChange: (callback) => ipcRenderer.on('relay:status', (_, data) => callback(data)),
  },
  manifest: {
    download: () => ipcRenderer.invoke('manifest:download'),
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
  },
});
