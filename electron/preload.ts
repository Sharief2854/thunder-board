import { contextBridge, ipcRenderer } from 'electron';

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: {
    version: string;
    releaseDate?: string;
    releaseNotes?: string;
  };
  progress?: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
  error?: string;
  devMessage?: string;
  currentVersion?: string;
}

export interface SmartBoardAPI {
  // Window Controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  undockToFloating?: () => Promise<{ success: boolean }>;
  dockToFull?: () => Promise<{ success: boolean }>;
  isAlwaysOnTop?: () => Promise<boolean>;
  toggleAlwaysOnTop?: () => Promise<boolean>;
  collapseToEdge?: () => Promise<{ success: boolean; edge?: 'left' | 'right' }>;
  expandFromEdge?: () => Promise<{ success: boolean }>;
  moveEdgePosition?: (newY: number) => Promise<void>;
  onEdgeExpanded?: (callback: () => void) => () => void;
  onToggleFloating?: (callback: () => void) => () => void;
  onTriggerCollapseToEdge?: (callback: () => void) => () => void;
  getVerticalPlacement?: () => Promise<'top' | 'bottom'>;
  onVerticalPlacementChanged?: (callback: (placement: 'top' | 'bottom') => void) => () => void;
  onWindowFocus?: (callback: () => void) => () => void;
  onWindowBlur?: (callback: () => void) => () => void;

  // Storage
  saveBoard: (id: string, data: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadBoard: (id: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  deleteBoard?: (id: string) => Promise<{ success: boolean; error?: string }>;
  listBoards: () => Promise<{ success: boolean; boards?: string[]; error?: string }>;

  // Backup & File Export/Import
  exportFile: (defaultName: string, content: string) => Promise<{ canceled: boolean; filePath?: string }>;
  importFile: () => Promise<{ canceled: boolean; content?: string; filePath?: string }>;
  selectDirectory?: () => Promise<{ canceled: boolean; path?: string }>;
  saveBatchToDirectory?: (dirPath: string, batchName: string, data: string, htmlContent?: string) => Promise<{ success: boolean; filePath?: string; htmlPath?: string; error?: string }>;
  listAllLessonFiles?: () => Promise<{ success: boolean; files?: Array<{ name: string; path: string; size: number; updatedAt: number; ext: string; type: 'board' | 'html' | 'lesson' }>; error?: string }>;
  showItemInFolder?: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  openPath?: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
  readFilePath?: (filePath: string) => Promise<{ success: boolean; content?: string; error?: string }>;
  readClipboardImage?: () => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
  onBeforeQuit?: (callback: () => void) => () => void;
  sendQuitConfirmed?: () => void;

  // Auto Updater
  checkForUpdates?: () => Promise<{ success: boolean; isDev?: boolean; message?: string; error?: string }>;
  downloadUpdate?: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstall?: () => Promise<{ success: boolean; error?: string }>;
  getUpdateStatus?: () => Promise<UpdateStatus>;
  onUpdateStatus?: (callback: (status: UpdateStatus) => void) => () => void;
  getAppVersion?: () => Promise<string>;
}

const api: SmartBoardAPI = {
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
  moveEdgePosition: (newY: number) => ipcRenderer.invoke('window:moveEdgePosition', newY),
  onEdgeExpanded: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('window:edgeExpanded', handler);
    return () => {
      ipcRenderer.removeListener('window:edgeExpanded', handler);
    };
  },
  onToggleFloating: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('window:toggleFloating', handler);
    return () => {
      ipcRenderer.removeListener('window:toggleFloating', handler);
    };
  },
  onTriggerCollapseToEdge: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('window:triggerCollapseToEdge', handler);
    return () => {
      ipcRenderer.removeListener('window:triggerCollapseToEdge', handler);
    };
  },
  getVerticalPlacement: () => ipcRenderer.invoke('window:getVerticalPlacement'),
  onVerticalPlacementChanged: (callback: (placement: 'top' | 'bottom') => void) => {
    const handler = (_event: any, placement: 'top' | 'bottom') => callback(placement);
    ipcRenderer.on('window:verticalPlacement', handler);
    return () => {
      ipcRenderer.removeListener('window:verticalPlacement', handler);
    };
  },
  onWindowFocus: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('window:focus', handler);
    return () => {
      ipcRenderer.removeListener('window:focus', handler);
    };
  },
  onWindowBlur: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('window:blur', handler);
    return () => {
      ipcRenderer.removeListener('window:blur', handler);
    };
  },

  saveBoard: (id: string, data: string) => ipcRenderer.invoke('storage:saveBoard', { id, data }),
  loadBoard: (id: string) => ipcRenderer.invoke('storage:loadBoard', id),
  deleteBoard: (id: string) => ipcRenderer.invoke('storage:deleteBoard', id),
  listBoards: () => ipcRenderer.invoke('storage:listBoards'),

  exportFile: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:exportFile', { defaultName, content }),
  importFile: () => ipcRenderer.invoke('dialog:importFile'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  saveBatchToDirectory: (dirPath: string, batchName: string, data: string, htmlContent?: string) => ipcRenderer.invoke('storage:saveBatchToDirectory', { dirPath, batchName, data, htmlContent }),
  listAllLessonFiles: () => ipcRenderer.invoke('storage:listAllLessonFiles'),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  openPath: (folderPath: string) => ipcRenderer.invoke('shell:openPath', folderPath),
  readFilePath: (filePath: string) => ipcRenderer.invoke('storage:readFilePath', filePath),
  readClipboardImage: () => ipcRenderer.invoke('clipboard:readImage'),
  onBeforeQuit: (callback: () => void) => {
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
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const handler = (_event: any, status: UpdateStatus) => callback(status);
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
