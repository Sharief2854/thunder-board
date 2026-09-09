const { contextBridge, ipcRenderer } = require('electron');

const api = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  saveBoard: (id, data) => ipcRenderer.invoke('storage:saveBoard', { id, data }),
  loadBoard: (id) => ipcRenderer.invoke('storage:loadBoard', id),
  listBoards: () => ipcRenderer.invoke('storage:listBoards'),

  exportFile: (defaultName, content) => ipcRenderer.invoke('dialog:exportFile', { defaultName, content }),
  importFile: () => ipcRenderer.invoke('dialog:importFile'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  saveBatchToDirectory: (dirPath, batchName, data, htmlContent) => ipcRenderer.invoke('storage:saveBatchToDirectory', { dirPath, batchName, data, htmlContent }),
};

contextBridge.exposeInMainWorld('smartBoardAPI', api);
