const { contextBridge, ipcRenderer } = require('electron');

const api = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  undockToFloating: () => ipcRenderer.invoke('window:undockToFloating'),
  dockToFull: () => ipcRenderer.invoke('window:dockToFull'),
  isAlwaysOnTop: () => ipcRenderer.invoke('window:isAlwaysOnTop'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggleAlwaysOnTop'),
  collapseToEdge: () => ipcRenderer.invoke('window:collapseToEdge'),
  expandFromEdge: () => ipcRenderer.invoke('window:expandFromEdge'),
  moveEdgePosition: (newY) => ipcRenderer.invoke('window:moveEdgePosition', newY),
  onEdgeExpanded: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window:edgeExpanded', handler);
    return () => {
      ipcRenderer.removeListener('window:edgeExpanded', handler);
    };
  },
  onToggleFloating: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window:toggleFloating', handler);
    return () => {
      ipcRenderer.removeListener('window:toggleFloating', handler);
    };
  },
  onTriggerCollapseToEdge: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window:triggerCollapseToEdge', handler);
    return () => {
      ipcRenderer.removeListener('window:triggerCollapseToEdge', handler);
    };
  },
  getVerticalPlacement: () => ipcRenderer.invoke('window:getVerticalPlacement'),
  onVerticalPlacementChanged: (callback) => {
    const handler = (_event, placement) => callback(placement);
    ipcRenderer.on('window:verticalPlacement', handler);
    return () => {
      ipcRenderer.removeListener('window:verticalPlacement', handler);
    };
  },
  onWindowFocus: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window:focus', handler);
    return () => {
      ipcRenderer.removeListener('window:focus', handler);
    };
  },
  onWindowBlur: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('window:blur', handler);
    return () => {
      ipcRenderer.removeListener('window:blur', handler);
    };
  },

  saveBoard: (id, data) => ipcRenderer.invoke('storage:saveBoard', { id, data }),
  loadBoard: (id) => ipcRenderer.invoke('storage:loadBoard', id),
  deleteBoard: (id) => ipcRenderer.invoke('storage:deleteBoard', id),
  listBoards: () => ipcRenderer.invoke('storage:listBoards'),

  exportFile: (defaultName, content) => ipcRenderer.invoke('dialog:exportFile', { defaultName, content }),
  importFile: () => ipcRenderer.invoke('dialog:importFile'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  saveBatchToDirectory: (dirPath, batchName, data, htmlContent) => ipcRenderer.invoke('storage:saveBatchToDirectory', { dirPath, batchName, data, htmlContent }),
  listAllLessonFiles: () => ipcRenderer.invoke('storage:listAllLessonFiles'),
  showItemInFolder: (filePath) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openPath: (folderPath) => ipcRenderer.invoke('shell:openPath', folderPath),
  readFilePath: (filePath) => ipcRenderer.invoke('storage:readFilePath', filePath),
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),
  onBeforeQuit: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('app:before-quit', handler);
    return () => {
      ipcRenderer.removeListener('app:before-quit', handler);
    };
  },
  sendQuitConfirmed: () => ipcRenderer.send('app:quit-confirmed'),

  // Auto Updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  quitAndInstall: () => ipcRenderer.invoke('updater:install'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:getStatus'),
  onUpdateStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('updater:status', handler);
    return () => {
      ipcRenderer.removeListener('updater:status', handler);
    };
  },
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
};

contextBridge.exposeInMainWorld('smartBoardAPI', api);
contextBridge.exposeInMainWorld('chalkByteAPI', api);
contextBridge.exposeInMainWorld('thunderBoardAPI', api);
