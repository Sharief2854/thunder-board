import { app, ipcMain, BrowserWindow } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

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
  currentVersion: string;
}

let targetWindow: BrowserWindow | null = null;
let currentStatus: UpdateStatus = {
  status: 'idle',
  currentVersion: app.getVersion(),
};

function broadcastStatus() {
  if (targetWindow && !targetWindow.isDestroyed()) {
    targetWindow.webContents.send('updater:status', currentStatus);
  }
}

export function initAutoUpdater(window: BrowserWindow) {
  targetWindow = window;
  currentStatus.currentVersion = app.getVersion();

  // Configure electron-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  // Event Listeners
  autoUpdater.on('checking-for-update', () => {
    currentStatus = {
      status: 'checking',
      currentVersion: app.getVersion(),
    };
    broadcastStatus();
  });

  autoUpdater.on('update-available', (info) => {
    let notes: string | undefined;
    if (typeof info.releaseNotes === 'string') {
      notes = info.releaseNotes;
    } else if (Array.isArray(info.releaseNotes)) {
      notes = info.releaseNotes.map((n: any) => (typeof n === 'string' ? n : n.note || '')).join('\n');
    }

    currentStatus = {
      status: 'available',
      currentVersion: app.getVersion(),
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: notes,
      },
    };
    broadcastStatus();
  });

  autoUpdater.on('update-not-available', (_info) => {
    currentStatus = {
      status: 'not-available',
      currentVersion: app.getVersion(),
    };
    broadcastStatus();
  });

  autoUpdater.on('error', (err) => {
    currentStatus = {
      status: 'error',
      currentVersion: app.getVersion(),
      error: err ? err.message || String(err) : 'Unknown updater error',
    };
    broadcastStatus();
  });

  autoUpdater.on('download-progress', (progressObj) => {
    currentStatus = {
      status: 'downloading',
      currentVersion: app.getVersion(),
      progress: {
        percent: Math.round(progressObj.percent || 0),
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
      },
    };
    broadcastStatus();
  });

  autoUpdater.on('update-downloaded', (info) => {
    currentStatus = {
      status: 'downloaded',
      currentVersion: app.getVersion(),
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
      },
    };
    broadcastStatus();
  });

  // Automatically check for updates 6 seconds after app startup if packaged
  if (app.isPackaged) {
    setTimeout(() => {
      try {
        autoUpdater.checkForUpdates().catch((err) => {
          console.warn('[ThunderBoard AutoUpdater] Initial check error:', err?.message || err);
        });
      } catch (err) {
        console.warn('[ThunderBoard AutoUpdater] Check error:', err);
      }
    }, 6000);
  }
}

// Register IPC handlers
export function registerUpdaterIpc() {
  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      currentStatus = {
        status: 'not-available',
        currentVersion: app.getVersion(),
        devMessage: 'ThunderBoard is running in development mode. In packaged builds, updates are automatically fetched from GitHub Releases (Sharief2854/thunder-board).',
      };
      broadcastStatus();
      return {
        success: true,
        isDev: true,
        message: currentStatus.devMessage,
      };
    }

    try {
      currentStatus = {
        status: 'checking',
        currentVersion: app.getVersion(),
      };
      broadcastStatus();
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error: any) {
      currentStatus = {
        status: 'error',
        currentVersion: app.getVersion(),
        error: error?.message || 'Failed to check for updates',
      };
      broadcastStatus();
      return { success: false, error: currentStatus.error };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      currentStatus = {
        status: 'downloading',
        currentVersion: app.getVersion(),
        progress: {
          percent: 0,
          bytesPerSecond: 0,
          transferred: 0,
          total: 0,
        },
      };
      broadcastStatus();
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error: any) {
      currentStatus = {
        status: 'error',
        currentVersion: app.getVersion(),
        error: error?.message || 'Failed to download update',
      };
      broadcastStatus();
      return { success: false, error: currentStatus.error };
    }
  });

  ipcMain.handle('updater:install', async () => {
    try {
      // isSilent: false, isForceRunAfter: true
      autoUpdater.quitAndInstall(false, true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message };
    }
  });

  ipcMain.handle('updater:getStatus', () => {
    return currentStatus;
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });
}
