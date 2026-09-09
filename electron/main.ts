import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.thunderboard.app');
}
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.png');
  const icoPath = path.join(__dirname, '../build/icon.ico');
  const appIcon = process.platform === 'win32' && fs.existsSync(icoPath) ? icoPath : iconPath;

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#0b0f19',
    title: 'ThunderBoard - Intelligent Teaching Whiteboard & Code Canvas',
    icon: fs.existsSync(appIcon) ? appIcon : undefined,
    frame: false, // Custom sleek titlebar / borderless for teaching
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for preload script to communicate with ipcRenderer
      webSecurity: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production or direct standalone desktop launch, load the built dist/index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Window control IPC handlers
ipcMain.on('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  win?.minimize();
});

ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  win?.close();
});

ipcMain.handle('window:isMaximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return win?.isMaximized() ?? false;
});

// Offline Storage IPC Handlers
const getStorageDir = () => {
  const userDir = app.getPath('userData');
  const boardsDir = path.join(userDir, 'boards');
  if (!fs.existsSync(boardsDir)) {
    fs.mkdirSync(boardsDir, { recursive: true });
  }
  return boardsDir;
};

ipcMain.handle('storage:saveBoard', async (_event, { id, data }: { id: string; data: string }) => {
  try {
    const dir = getStorageDir();
    const filePath = path.join(dir, `${id}.json`);
    await fs.promises.writeFile(filePath, data, 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('storage:loadBoard', async (_event, id: string) => {
  try {
    const dir = getStorageDir();
    const filePath = path.join(dir, `${id}.json`);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, data: content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('storage:listBoards', async () => {
  try {
    const dir = getStorageDir();
    const files = await fs.promises.readdir(dir);
    const boards = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    return { success: true, boards };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('dialog:exportFile', async (_event, { defaultName, content }: { defaultName: string; content: string }) => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export ThunderBoard Lesson',
    defaultPath: defaultName,
    filters: [
      { name: 'ThunderBoard Lesson (.thunderboard, .chalkbyte, .sblesson)', extensions: ['thunderboard', 'chalkbyte', 'sblesson', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (canceled || !filePath) return { canceled: true };

  await fs.promises.writeFile(filePath, content, 'utf-8');
  return { canceled: false, filePath };
});

ipcMain.handle('dialog:importFile', async () => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import ThunderBoard Lesson',
    properties: ['openFile'],
    filters: [
      { name: 'ThunderBoard Lesson (.thunderboard, .chalkbyte, .sblesson, .json)', extensions: ['thunderboard', 'chalkbyte', 'sblesson', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (canceled || !filePaths.length) return { canceled: true };

  const content = await fs.promises.readFile(filePaths[0], 'utf-8');
  return { canceled: false, content, filePath: filePaths[0] };
});

ipcMain.handle('dialog:selectDirectory', async () => {
  if (!mainWindow) return { canceled: true };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder to Save Batch',
    properties: ['openDirectory', 'createDirectory'],
  });

  if (canceled || !filePaths.length) return { canceled: true };
  return { canceled: false, path: filePaths[0] };
});

ipcMain.handle('storage:saveBatchToDirectory', async (_event, { dirPath, batchName, data, htmlContent }: { dirPath: string; batchName: string; data: string; htmlContent?: string }) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const safeName = batchName.replace(/[/\\?%*:|"<>]/g, '_');
    const filePath = path.join(dirPath, `${safeName}.thunderboard`);
    await fs.promises.writeFile(filePath, data, 'utf-8');

    let htmlPath: string | undefined;
    if (htmlContent) {
      htmlPath = path.join(dirPath, `${safeName}_Student_Notes.html`);
      await fs.promises.writeFile(htmlPath, htmlContent, 'utf-8');
    }

    return { success: true, filePath, htmlPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
