import { app, BrowserWindow, ipcMain, dialog, shell, clipboard, screen, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initAutoUpdater, registerUpdaterIpc } from './updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly lock app name to unify userData storage path across dev and packaged modes
app.setName('ThunderBoard v4');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.thunderboard.v4.app');
}
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const iconPng = path.join(__dirname, '../public/icon.png');
  const iconIcoPublic = path.join(__dirname, '../public/icon.ico');
  const iconIcoBuild = path.join(__dirname, '../build/icon.ico');

  let appIcon = iconPng;
  if (process.platform === 'win32') {
    if (fs.existsSync(iconIcoPublic)) {
      appIcon = iconIcoPublic;
    } else if (fs.existsSync(iconIcoBuild)) {
      appIcon = iconIcoBuild;
    }
  }

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#000000',
    title: 'ThunderBoard v4 - Intelligent Teaching Whiteboard with AI Hand Tracking & Code Canvas',
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
    if (mainWindow) {
      initAutoUpdater(mainWindow);
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production or direct standalone desktop launch, load the built dist/index.html
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      // Inform renderer to flush pending changes to disk
      mainWindow?.webContents.send('app:before-quit');
      // Set safety timeout to exit even if renderer hangs
      setTimeout(() => {
        isQuitting = true;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy();
        }
      }, 800);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (edgePanelWindow && !edgePanelWindow.isDestroyed()) {
      edgePanelWindow.destroy();
      edgePanelWindow = null;
    }
  });

  const checkVerticalPlacement = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const bounds = mainWindow.getBounds();
      const display = screen.getDisplayMatching(bounds);
      const workArea = display.workArea;
      // If the board is positioned in the top half of the screen, move controls to the bottom of the board
      // If the board is positioned in the bottom half of the screen, move controls to the top of the board
      const isTopHalf = (bounds.y + bounds.height / 2) < (workArea.y + workArea.height / 2);
      mainWindow.webContents.send('window:verticalPlacement', isTopHalf ? 'bottom' : 'top');
    }
  };

  mainWindow.on('move', checkVerticalPlacement);
  mainWindow.on('resize', checkVerticalPlacement);

  mainWindow.on('focus', () => {
    mainWindow?.webContents.send('window:focus');
  });

  mainWindow.on('blur', () => {
    mainWindow?.webContents.send('window:blur');
  });

  mainWindow.on('restore', () => {
    if (edgePanelWindow && !edgePanelWindow.isDestroyed() && edgePanelWindow.isVisible()) {
      expandBoardFromEdge();
    }
  });
}

let isQuitting = false;

let savedWindowBounds: { x: number; y: number; width: number; height: number; isMaximized: boolean } | null = null;
let savedFloatingBounds: { x: number; y: number; width: number; height: number } | null = null;

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
  isQuitting = true;
  win?.close();
});

ipcMain.on('app:quit-confirmed', () => {
  isQuitting = true;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
});

ipcMain.handle('window:isMaximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return win?.isMaximized() ?? false;
});

// Undocked / Picture-in-Picture Floating Board IPC Handlers
ipcMain.handle('window:undockToFloating', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win) return { success: false };

  const isMax = win.isMaximized();
  const bounds = isMax ? win.getNormalBounds() : win.getBounds();
  savedWindowBounds = {
    ...bounds,
    isMaximized: isMax,
  };

  if (isMax) {
    win.unmaximize();
  }

  win.setMinimumSize(360, 260);

  if (savedFloatingBounds) {
    win.setBounds(savedFloatingBounds);
  } else {
    // Default floating size positioned on the LEFT side of current screen
    const display = screen.getDisplayMatching(win.getBounds());
    const workArea = display.workArea;
    const width = 640;
    const height = 520;
    const x = Math.round(workArea.x + 36);
    const y = Math.round(workArea.y + (workArea.height - height) / 2);
    win.setBounds({ x, y, width, height });
  }

  win.setAlwaysOnTop(true, 'screen-saver');
  return { success: true };
});

ipcMain.handle('window:dockToFull', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win) return { success: false };

  if (edgePanelWindow && !edgePanelWindow.isDestroyed()) {
    edgePanelWindow.hide();
  }

  savedFloatingBounds = win.getBounds();

  win.setAlwaysOnTop(false);
  win.setMinimumSize(1024, 600);

  if (savedWindowBounds) {
    if (savedWindowBounds.isMaximized) {
      win.maximize();
    } else {
      win.setBounds({
        x: savedWindowBounds.x,
        y: savedWindowBounds.y,
        width: savedWindowBounds.width,
        height: savedWindowBounds.height,
      });
    }
  } else {
    win.maximize();
  }

  return { success: true };
});

ipcMain.handle('window:isAlwaysOnTop', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return win?.isAlwaysOnTop() ?? false;
});

ipcMain.handle('window:toggleAlwaysOnTop', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win) return false;
  const current = win.isAlwaysOnTop();
  win.setAlwaysOnTop(!current, 'screen-saver');
  return !current;
});

let savedBeforeCollapseBounds: { x: number; y: number; width: number; height: number } | null = null;
let currentEdgeSide: 'left' | 'right' = 'left';
let edgePanelWindow: BrowserWindow | null = null;

function createOrShowEdgePanel(side: 'left' | 'right', initialY: number, targetDisplay: Electron.Display) {
  currentEdgeSide = side;
  const workArea = targetDisplay.workArea;
  const edgeWinWidth = 24;
  const edgeWinHeight = 76;
  const targetX = side === 'left' ? workArea.x : Math.round(workArea.x + workArea.width - 29);
  const targetY = Math.min(
    Math.max(Math.round(initialY), workArea.y + 10),
    workArea.y + workArea.height - edgeWinHeight - 10
  );

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: ${side === 'left' ? 'flex-start' : 'flex-end'};
    }
    .edge-line {
      width: 4px;
      height: 56px;
      background: #3b82f6;
      border-radius: ${side === 'left' ? '0 4px 4px 0' : '4px 0 0 4px'};
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.95), 0 0 4px #60a5fa;
      cursor: pointer;
      transition: background-color 0.15s, box-shadow 0.15s;
    }
    .edge-line:hover {
      background: #60a5fa;
      box-shadow: 0 0 14px rgba(96, 165, 250, 1), 0 0 6px #93c5fd;
    }
  </style>
</head>
<body>
  <div class="edge-line" id="line" title="Click to open Whiteboard (or press Ctrl+Shift+E / Ctrl+Shift+D) • Drag up/down to reposition along edge"></div>
  <script>
    const { ipcRenderer } = require('electron');
    let isDragging = false;
    let startY = 0;
    const line = document.getElementById('line');

    // Keyboard shortcut if edge line has focus
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        ipcRenderer.send('edge:click');
      }
    });

    line.addEventListener('mousedown', (e) => {
      isDragging = false;
      startY = e.screenY;
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
      const delta = e.screenY - startY;
      if (Math.abs(delta) > 3) {
        isDragging = true;
        ipcRenderer.send('edge:drag', delta);
        startY = e.screenY;
      }
    }

    function onMouseUp(e) {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (!isDragging) {
        ipcRenderer.send('edge:click');
      }
    }
  </script>
</body>
</html>`;

  if (!edgePanelWindow || edgePanelWindow.isDestroyed()) {
    edgePanelWindow = new BrowserWindow({
      width: edgeWinWidth,
      height: edgeWinHeight,
      x: targetX,
      y: targetY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    edgePanelWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    edgePanelWindow.once('ready-to-show', () => {
      edgePanelWindow?.show();
      edgePanelWindow?.setAlwaysOnTop(true, 'screen-saver');
      const b = edgePanelWindow?.getBounds();
      if (b) {
        const exactX = side === 'right' ? Math.round(workArea.x + workArea.width - b.width) : workArea.x;
        edgePanelWindow?.setPosition(exactX, Math.round(targetY));
      }
    });
  } else {
    edgePanelWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    edgePanelWindow.show();
    edgePanelWindow.setAlwaysOnTop(true, 'screen-saver');
    const b = edgePanelWindow.getBounds();
    const exactX = side === 'right' ? Math.round(workArea.x + workArea.width - b.width) : workArea.x;
    edgePanelWindow.setPosition(exactX, Math.round(targetY));
  }
}

function expandBoardFromEdge() {
  if (edgePanelWindow && !edgePanelWindow.isDestroyed()) {
    edgePanelWindow.hide();
  }
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const display = screen.getDisplayMatching(edgePanelWindow && !edgePanelWindow.isDestroyed() ? edgePanelWindow.getBounds() : mainWindow.getBounds());
  const workArea = display.workArea;

  const edgeBounds = edgePanelWindow && !edgePanelWindow.isDestroyed()
    ? edgePanelWindow.getBounds()
    : { y: workArea.y + 100, height: 76 };

  const targetW = savedBeforeCollapseBounds?.width || 640;
  const targetH = savedBeforeCollapseBounds?.height || 520;
  const targetX = currentEdgeSide === 'left'
    ? Math.round(workArea.x + 24)
    : Math.round(workArea.x + workArea.width - targetW - 24);
  const targetY = Math.min(
    Math.max(Math.round(edgeBounds.y + edgeBounds.height / 2 - targetH / 2), workArea.y + 15),
    workArea.y + workArea.height - targetH - 15
  );

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.setMinimumSize(360, 260);
  mainWindow.setBounds({ x: targetX, y: targetY, width: targetW, height: targetH });
  mainWindow.show();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.webContents.send('window:edgeExpanded');
}

ipcMain.on('edge:drag', (_event, deltaY: number) => {
  if (!edgePanelWindow || edgePanelWindow.isDestroyed()) return;
  const [_curX, curY] = edgePanelWindow.getPosition();
  const display = screen.getDisplayMatching(edgePanelWindow.getBounds());
  const newY = Math.min(
    Math.max(curY + deltaY, display.workArea.y + 10),
    display.workArea.y + display.workArea.height - 86
  );
  const b = edgePanelWindow.getBounds();
  const fixedX = currentEdgeSide === 'right'
    ? Math.round(display.workArea.x + display.workArea.width - b.width)
    : display.workArea.x;
  edgePanelWindow.setPosition(fixedX, Math.round(newY));
});

ipcMain.on('edge:click', () => {
  expandBoardFromEdge();
});

function collapseBoardToEdge(targetWin?: BrowserWindow | null) {
  try {
    const win = targetWin || mainWindow;
    if (!win || win.isDestroyed()) return { success: false };

    const bounds = win.getBounds();
    savedBeforeCollapseBounds = bounds;

    const display = screen.getDisplayMatching(bounds);
    const workArea = display.workArea;

    const isLeft = (bounds.x + bounds.width / 2) < (workArea.x + workArea.width / 2);
    currentEdgeSide = isLeft ? 'left' : 'right';

    // Show edge line first so user sees the glowing line immediately
    createOrShowEdgePanel(
      currentEdgeSide,
      bounds.y + (bounds.height - 76) / 2,
      display
    );

    // Minimize instead of hide so ThunderBoard stays prominently in the Windows Taskbar!
    win.setAlwaysOnTop(false);
    win.minimize();

    return { success: true, edge: currentEdgeSide };
  } catch (err) {
    console.error('Error collapsing to edge:', err);
    mainWindow?.show();
    return { success: false };
  }
}

function toggleEdgePanelGlobal() {
  if (edgePanelWindow && !edgePanelWindow.isDestroyed() && edgePanelWindow.isVisible()) {
    expandBoardFromEdge();
  } else {
    collapseBoardToEdge(mainWindow);
  }
}

function togglePopUpBoardGlobal() {
  if (edgePanelWindow && !edgePanelWindow.isDestroyed() && edgePanelWindow.isVisible()) {
    expandBoardFromEdge();
    return;
  }
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!mainWindow.isVisible()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow.webContents.send('window:toggleFloating');
}

ipcMain.handle('window:collapseToEdge', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  return collapseBoardToEdge(win);
});

ipcMain.handle('window:moveEdgePosition', (_event, newY: number) => {
  if (!edgePanelWindow || edgePanelWindow.isDestroyed()) return;
  const [x] = edgePanelWindow.getPosition();
  const display = screen.getDisplayMatching(edgePanelWindow.getBounds());
  const clampedY = Math.min(
    Math.max(newY, display.workArea.y + 10),
    display.workArea.y + display.workArea.height - 86
  );
  edgePanelWindow.setPosition(x, Math.round(clampedY));
});

ipcMain.handle('window:expandFromEdge', () => {
  expandBoardFromEdge();
  return { success: true };
});

ipcMain.handle('window:getVerticalPlacement', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  if (!win) return 'top';
  const bounds = win.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const workArea = display.workArea;
  const isTopHalf = (bounds.y + bounds.height / 2) < (workArea.y + workArea.height / 2);
  return isTopHalf ? 'bottom' : 'top';
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
    const tmpPath = path.join(dir, `${id}.tmp`);
    // Atomic write via temporary file + rename to prevent data corruption
    await fs.promises.writeFile(tmpPath, data, 'utf-8');
    try {
      await fs.promises.rename(tmpPath, filePath);
    } catch {
      // Direct write fallback if rename fails on Windows file locks
      await fs.promises.writeFile(filePath, data, 'utf-8');
      if (fs.existsSync(tmpPath)) {
        await fs.promises.unlink(tmpPath).catch(() => {});
      }
    }
    return { success: true, path: filePath };
  } catch (error) {
    try {
      const dir = getStorageDir();
      const filePath = path.join(dir, `${id}.json`);
      await fs.promises.writeFile(filePath, data, 'utf-8');
      return { success: true, path: filePath };
    } catch (fallbackError) {
      return { success: false, error: (fallbackError as Error).message };
    }
  }
});

ipcMain.handle('storage:deleteBoard', async (_event, id: string) => {
  try {
    const dir = getStorageDir();
    const cleanId = id.replace(/^batch_/, '');
    const possibleFiles = [
      path.join(dir, `${id}.json`),
      path.join(dir, `batch_${id}.json`),
      path.join(dir, `batch_batch_${cleanId}.json`),
      path.join(dir, `${cleanId}.json`),
      path.join(dir, `${id}.tmp`),
      path.join(dir, `batch_${id}.tmp`),
    ];
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        try { await fs.promises.unlink(file); } catch {}
      }
    }

    // Persist to deleted_batches.json so legacy imports never resurrect it
    const deletedListPath = path.join(dir, 'deleted_batches.json');
    let deletedList: string[] = [];
    if (fs.existsSync(deletedListPath)) {
      try {
        deletedList = JSON.parse(await fs.promises.readFile(deletedListPath, 'utf-8'));
      } catch {}
    }
    if (!deletedList.includes(cleanId)) {
      deletedList.push(cleanId);
    }
    if (!deletedList.includes(id)) {
      deletedList.push(id);
    }
    await fs.promises.writeFile(deletedListPath, JSON.stringify(deletedList), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('storage:loadBoard', async (_event, id: string) => {
  try {
    const dir = getStorageDir();
    const filePath = path.join(dir, `${id}.json`);

    // Intelligent loader for workspace_data: merges latest individual batch files & respects deletions
    if (id === 'workspace_data') {
      let mainWorkspace: any = null;
      if (fs.existsSync(filePath)) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          mainWorkspace = JSON.parse(content);
        } catch (e) {
          console.warn('Error reading existing workspace_data:', e);
        }
      }

      // Read deleted batches list
      const deletedListPath = path.join(dir, 'deleted_batches.json');
      let deletedSet = new Set<string>();
      if (fs.existsSync(deletedListPath)) {
        try {
          const list = JSON.parse(await fs.promises.readFile(deletedListPath, 'utf-8'));
          if (Array.isArray(list)) {
            deletedSet = new Set(list.map((x: string) => x.replace(/^batch_/, '')));
            list.forEach((x: string) => deletedSet.add(x));
          }
        } catch {}
      }

      // If workspace exists in v3, synchronize with latest individual files and clean deletions
      if (mainWorkspace && Array.isArray(mainWorkspace.batches) && mainWorkspace.batches.length > 0) {
        // 1. Filter out any batch that was deleted
        mainWorkspace.batches = mainWorkspace.batches.filter((b: any) => {
          const cleanId = b.id ? b.id.replace(/^batch_/, '') : '';
          return !deletedSet.has(cleanId) && !deletedSet.has(b.id);
        });

        // 2. Scan boards directory to ensure EVERY batch has its latest pages and strokes
        let hasUpgrades = false;
        for (let i = 0; i < mainWorkspace.batches.length; i++) {
          const b = mainWorkspace.batches[i];
          const cleanId = b.id.replace(/^batch_/, '');
          const candidates = [
            path.join(dir, `batch_batch_${cleanId}.json`),
            path.join(dir, `batch_${cleanId}.json`),
            path.join(dir, `batch_${b.id}.json`),
            path.join(dir, `${b.id}.json`),
          ];
          for (const cand of candidates) {
            if (fs.existsSync(cand)) {
              try {
                const indiv = JSON.parse(await fs.promises.readFile(cand, 'utf-8'));
                if (indiv && Array.isArray(indiv.pages)) {
                  const wsStrokes = Object.keys(b.strokes || {}).length;
                  const indivStrokes = Object.keys(indiv.strokes || {}).length;
                  if (
                    indiv.pages.length > b.pages.length ||
                    indivStrokes > wsStrokes ||
                    (indiv.updatedAt && b.updatedAt && indiv.updatedAt > b.updatedAt)
                  ) {
                    mainWorkspace.batches[i] = indiv;
                    hasUpgrades = true;
                    break;
                  }
                }
              } catch {}
            }
          }
        }

        // Check if CLI argument specifies a batch
        const batchArg = process.argv.find((a: string) => a.startsWith('--batch='));
        const batchIdArg = process.argv.find((a: string) => a.startsWith('--batch-id='));
        if (batchArg || batchIdArg) {
          const rawVal = batchArg
            ? batchArg.replace('--batch=', '').replace(/^["']|["']$/g, '')
            : batchIdArg!.replace('--batch-id=', '').replace(/^["']|["']$/g, '');
          const cleanVal = rawVal.trim().toLowerCase();
          const targetBatch = mainWorkspace.batches.find((b: any) =>
            (b.id && b.id.toLowerCase() === cleanVal) ||
            (b.name && b.name.toLowerCase() === cleanVal)
          );
          if (targetBatch) {
            mainWorkspace.activeBatchId = targetBatch.id;
            hasUpgrades = true;
            console.log(`[ThunderBoard] Loaded batch from CLI argument: "${targetBatch.name}" (${targetBatch.id})`);
          }
        }

        const hasValidActive = mainWorkspace.batches.some((b: any) => b.id === mainWorkspace.activeBatchId);
        if (!hasValidActive && mainWorkspace.batches.length > 0) {
          mainWorkspace.activeBatchId = mainWorkspace.batches[0].id;
          hasUpgrades = true;
        }

        const resultJson = JSON.stringify(mainWorkspace);
        if (hasUpgrades) {
          await fs.promises.writeFile(filePath, resultJson, 'utf-8').catch(() => {});
        }
        return { success: true, data: resultJson };
      }

      // One-time fallback: check legacy paths if v4 has no workspace data at all
      const userRoaming = path.dirname(app.getPath('userData')); // e.g. AppData/Roaming
      const legacyPaths = [
        path.join(userRoaming, 'ThunderBoard v3', 'boards', 'workspace_data.json'),
        path.join(userRoaming, 'ThunderBoard v2', 'boards', 'workspace_data.json'),
        path.join(userRoaming, 'ThunderBoard', 'boards', 'workspace_data.json'),
        path.join(userRoaming, 'smart-board', 'boards', 'workspace_data.json'),
      ];

      mainWorkspace = { activeBatchId: '', batches: [] };
      const existingBatchIds = new Set<string>();
      const normalizedCurrentPath = path.resolve(filePath).toLowerCase();

      for (const legPath of legacyPaths) {
        const normLeg = path.resolve(legPath).toLowerCase();
        if (normLeg !== normalizedCurrentPath && fs.existsSync(legPath)) {
          try {
            const legData = JSON.parse(await fs.promises.readFile(legPath, 'utf-8'));
            if (legData && Array.isArray(legData.batches)) {
              for (const b of legData.batches) {
                const cleanId = b.id ? b.id.replace(/^batch_/, '') : '';
                if (!deletedSet.has(cleanId) && !deletedSet.has(b.id) && !existingBatchIds.has(b.id)) {
                  mainWorkspace.batches.push(b);
                  existingBatchIds.add(b.id);
                }
              }
              if (!mainWorkspace.activeBatchId && legData.activeBatchId) {
                mainWorkspace.activeBatchId = legData.activeBatchId;
              }
            }
          } catch (e) {
            console.warn('Error reading legacy workspace:', e);
          }
        }
      }

      if (mainWorkspace.batches.length > 0) {
        const hasValidActive = mainWorkspace.batches.some((b: any) => b.id === mainWorkspace.activeBatchId);
        if (!hasValidActive) {
          mainWorkspace.activeBatchId = mainWorkspace.batches[0].id;
        }
        await fs.promises.writeFile(filePath, JSON.stringify(mainWorkspace), 'utf-8');
        return { success: true, data: JSON.stringify(mainWorkspace) };
      }
    }

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

// Comprehensive Scanner for all created files (.thunderboard, .sblesson, .json, .html)
ipcMain.handle('storage:listAllLessonFiles', async () => {
  try {
    const results: Array<{
      name: string;
      path: string;
      size: number;
      updatedAt: number;
      ext: string;
      type: 'board' | 'html' | 'lesson';
    }> = [];

    const dir = getStorageDir();
    const scannedDirs = new Set<string>([dir]);

    // Include legacy boards dirs
    const userRoaming = path.dirname(app.getPath('userData'));
    scannedDirs.add(path.join(userRoaming, 'smart-board', 'boards'));
    scannedDirs.add(path.join(userRoaming, 'thunderboard', 'boards'));

    // Include user Documents/ThunderBoard if exists
    try {
      const docsDir = path.join(app.getPath('documents'), 'ThunderBoard');
      if (fs.existsSync(docsDir)) scannedDirs.add(docsDir);
    } catch {}

    for (const folder of scannedDirs) {
      if (!fs.existsSync(folder)) continue;
      try {
        const files = await fs.promises.readdir(folder);
        for (const file of files) {
          const fullPath = path.join(folder, file);
          try {
            const stat = await fs.promises.stat(fullPath);
            if (stat.isFile()) {
              const lower = file.toLowerCase();
              let type: 'board' | 'html' | 'lesson' | null = null;
              if (lower.endsWith('.thunderboard') || lower.endsWith('.chalkbyte') || lower.endsWith('.sblesson')) {
                type = 'lesson';
              } else if (lower.endsWith('.html') || lower.endsWith('.htm')) {
                type = 'html';
              } else if (lower.endsWith('.json') && file !== 'workspace_data.json' && file !== 'custom_syntax_model.json') {
                type = 'board';
              }

              if (type) {
                results.push({
                  name: file,
                  path: fullPath,
                  size: stat.size,
                  updatedAt: stat.mtimeMs,
                  ext: path.extname(file),
                  type,
                });
              }
            }
          } catch {}
        }
      } catch {}
    }

    results.sort((a, b) => b.updatedAt - a.updatedAt);
    return { success: true, files: results };
  } catch (error) {
    return { success: false, error: (error as Error).message, files: [] };
  }
});

ipcMain.handle('shell:showItemInFolder', async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return { success: true };
    }
    return { success: false, error: 'Path does not exist' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('shell:openPath', async (_event, folderPath: string) => {
  try {
    if (fs.existsSync(folderPath)) {
      await shell.openPath(folderPath);
      return { success: true };
    }
    return { success: false, error: 'Path does not exist' };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
});

ipcMain.handle('storage:readFilePath', async (_event, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: (err as Error).message };
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
    let targetDir = dirPath && dirPath.trim().length > 0 ? dirPath.trim() : getStorageDir();
    if (!fs.existsSync(targetDir)) {
      try {
        fs.mkdirSync(targetDir, { recursive: true });
      } catch {
        targetDir = getStorageDir();
      }
    }
    const safeName = batchName.replace(/[/\\?%*:|"<>]/g, '_');
    const filePath = path.join(targetDir, `${safeName}.thunderboard`);
    await fs.promises.writeFile(filePath, data, 'utf-8');

    let htmlPath: string | undefined;
    if (htmlContent) {
      htmlPath = path.join(targetDir, `${safeName}_Student_Notes.html`);
      await fs.promises.writeFile(htmlPath, htmlContent, 'utf-8');
    }

    return { success: true, filePath, htmlPath };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Read image from OS clipboard (Snipping Tool screenshot / copied image)
ipcMain.handle('clipboard:readImage', () => {
  try {
    const img = clipboard.readImage();
    if (img && !img.isEmpty()) {
      return { success: true, dataUrl: img.toDataURL() };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

app.whenReady().then(() => {
  registerUpdaterIpc();
  createWindow();

  // Register Global System-Wide Shortcuts for Fast Teaching & Edge Access
  // 1. Edge Panel Toggle (Tuck to edge / Expand from edge): Ctrl+Shift+E & Ctrl+Alt+E
  const edgeShortcuts = ['CommandOrControl+Shift+E', 'CommandOrControl+Alt+E', 'Alt+Shift+E'];
  edgeShortcuts.forEach(shortcut => {
    try {
      globalShortcut.register(shortcut, () => {
        toggleEdgePanelGlobal();
      });
    } catch (err) {
      console.warn(`[ThunderBoard] Failed to register global shortcut ${shortcut}:`, err);
    }
  });

  // 2. Pop-up Floating Board Toggle: Ctrl+Shift+D & Ctrl+Alt+D
  const popUpShortcuts = ['CommandOrControl+Shift+D', 'CommandOrControl+Alt+D', 'Alt+Shift+D'];
  popUpShortcuts.forEach(shortcut => {
    try {
      globalShortcut.register(shortcut, () => {
        togglePopUpBoardGlobal();
      });
    } catch (err) {
      console.warn(`[ThunderBoard] Failed to register global shortcut ${shortcut}:`, err);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
