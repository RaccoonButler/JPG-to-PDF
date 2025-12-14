const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  pickSave: () => ipcRenderer.invoke("pick-save"),
  convert: (options) => ipcRenderer.invoke("convert", options)
});
