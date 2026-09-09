import { contextBridge, ipcRenderer } from 'electron';

export interface SmartBoardAPI {
  // Window Controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;

  // Storage
  saveBoard: (id: string, data: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  loadBoard: (id: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  listBoards: () => Promise<{ success: boolean; boards?: string[]; error?: string }>;

  // Backup & File Export/Import
  exportFile: (defaultName: string, content: string) => Promise<{ canceled: boolean; filePath?: string }>;
  importFile: () => Promise<{ canceled: boolean; content?: string; filePath?: string }>;
}

const api: SmartBoardAPI = {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  saveBoard: (id: string, data: string) => ipcRenderer.invoke('storage:saveBoard', { id, data }),
  loadBoard: (id: string) => ipcRenderer.invoke('storage:loadBoard', id),
  listBoards: () => ipcRenderer.invoke('storage:listBoards'),

  exportFile: (defaultName: string, content: string) => ipcRenderer.invoke('dialog:exportFile', { defaultName, content }),
  importFile: () => ipcRenderer.invoke('dialog:importFile'),
};

contextBridge.exposeInMainWorld('smartBoardAPI', api);
contextBridge.exposeInMainWorld('chalkByteAPI', api);
contextBridge.exposeInMainWorld('thunderBoardAPI', api);
