# ThunderBoard Architecture & AI Development Guide

> **CRITICAL DIRECTIVE FOR ALL AI AGENTS & DEVELOPERS**:
> 1. **VERSION INTEGRITY**:
>    - **NEVER** modify, overwrite, delete, or re-target `release/` (ThunderBoard v1) or `release-v2/` (ThunderBoard v2).
>    - **NEVER** touch `v1-backup/` or `v2-backup/`.
>    - All new work, enhancements, refactoring, and builds belong strictly to **Version 3** (`thunderboard-v3`, output directory `release-v3/`).
> 2. **DOCUMENTATION INTEGRITY**:
>    - Always preserve existing comments, documentation, and WhiteboardDocument serialization schema.
> 3. **REFERENCE CHECKING**:
>    - When starting any task on this repository, consult this file (`DEVELOPMENT.md`) and `FEATURES.md` first.

---

## 📁 Repository Directory & Component Map

### 1. Root Configuration & Scripts
- `package.json`: Contains project metadata, npm scripts, and the `electron-builder` configuration for Version 3 (outputting to `release-v3/`).
- `vite.config.ts`: Vite bundler configuration for React + TypeScript and Electron main/preload bundling.
- `index.html`: Main HTML entry point with instant zero-latency splash screen.
- `release/`: Packaged binaries for Version 1 (Preserved - DO NOT MODIFY).
- `release-v2/`: Packaged binaries for Version 2 (Preserved - DO NOT MODIFY).
- `release-v3/`: Packaged binaries for Version 3 (`ThunderBoard v3.exe`, installer, and unpacked files).
- `v1-backup/` & `v2-backup/`: Archived frozen executables for v1 and v2.

---

### 2. Electron Layer (`electron/`)
- **`electron/main.ts`**:
  - The main process entry point.
  - Controls window lifecycle, frameless window settings, IPC handlers, single-instance locks, and auto-quit safety handlers.
  - **Storage IPC Handlers**:
    - `storage:saveBoard`: Atomic writes (`.tmp` + rename) to `AppData/Roaming/ThunderBoard v3/boards/`.
    - `storage:loadBoard`: Loads board data. Contains a one-time migration fallback that reads from `ThunderBoard v2` or `ThunderBoard` (v1) if v3 has no boards yet, ensuring zero data loss.
    - `storage:saveBatchToDirectory`: Exports batches directly to external user-selected folders with standalone HTML viewers.
  - **Window & PiP Floating IPC Handlers**:
    - `window:minimize`, `window:maximize`, `window:close`, `window:isMaximized`.
    - `window:undockToFloating`: Saves current window bounds and maximisation state, resizes window to floating dimensions (640x520 on left side of monitor), adjusts minimum size to 360x260, and sets `setAlwaysOnTop(true, 'screen-saver')`.
    - `window:dockToFull`: Saves floating bounds, resets `setAlwaysOnTop(false)`, resets minimum size to 1024x600, and restores previous full-screen / maximized bounds.
    - `window:isAlwaysOnTop`, `window:toggleAlwaysOnTop`.
    - `window:getVerticalPlacement`, `window:verticalPlacement`: Emits `'bottom'` when window is in the top half of the screen, or `'top'` when in the bottom half.
    - `window:collapseToEdge`, `window:expandFromEdge`: Samsung Edge panel mechanics; tucks floating board into a dedicated transparent window displaying strictly a 3.5px wide glowing blue line attached flush against the screen bezel (zero background cards, zero dimensional scaling), or smoothly expands back to the floating whiteboard.
    - `window:moveEdgePosition`, `edge:drag`, `edge:click`: Enables real-time drag-and-slide movement of the edge line anywhere from top to bottom along the screen edge, opening the whiteboard right at that chosen vertical height upon click.
- **`electron/preload.ts` & `electron/preload.cjs`**:
  - Bridges Node.js IPC to the browser renderer via `contextBridge.exposeInMainWorld('smartBoardAPI', ...)`.
  - Exposes typed functions for window management, storage, file dialogs, clipboard, and quit listeners.

---

### 3. Application State & Entry (`src/app/`, `src/main.tsx`)
- **`src/main.tsx`**: React 18 DOM root rendering `<App />`.
- **`src/app/App.tsx`**:
  - Central state orchestrator for ThunderBoard.
  - Holds `workspace` (`AppWorkspace`), active batch, active page, inking tools, colors, undo/redo stacks, and modals.
  - **Dual Display Modes**:
    - **Standard Full Mode**: Renders `TitleBar`, `PageNavigationHUD`, `PageDrawer`, `WhiteboardCanvas`, `Minimap`, and `Toolbar`.
    - **Undocked Floating Mode (`isFloatingBoard === true`)**:
      - Activated via `handleToggleFloatingBoard()` (`Ctrl+D`, `TitleBar` button, or `Toolbar` button).
      - Renders **ONLY** `FloatingBoardOverlay` and full-bleed `WhiteboardCanvas` with movable images/text.
      - Strips all menus, toolbars, and panels for a 100% distraction-free Google Meet-style floating board.
      - Supports `Esc` or `Ctrl+D` to dock back instantly.
  - **Keyboard Shortcuts Engine**: Global `keydown` handler for undo (`Ctrl+Z`), redo (`Ctrl+Y`), save (`Ctrl+S`), tool selection (`P`, `E`, `H`, `S`, `T`), and undocking (`Ctrl+D`).

---

### 4. Components (`src/components/`)

#### A. Canvas Components (`src/components/canvas/`)
- **`WhiteboardCanvas.tsx`**:
  - The core dual-canvas drawing engine (dynamic scratch canvas + committed ink canvas).
  - Handles high-DPI scaling (`window.devicePixelRatio`), viewport panning, zooming, and pointer events.
  - **Tap Gesture State Machine**:
    - `MAX_TAP_RADIUS = 10px`: Taps are strictly compared against the *initial anchor tap* (`recent[0]`), eliminating false combos while writing.
    - Drag threshold of `8px`: If the pointer drags more than 8px, tap combo tracking is cancelled immediately and treated as a drawing stroke.
    - Double-click: Cycles palette color via `onCycleColor()`.
    - Triple-click: Toggles pen <-> eraser via `onTogglePenEraser()`.
  - **In-Memory Outline Caching**: Checks `stroke.pathOutline`. If missing, computes outline once via `Smoother.computeOutline()` and caches it directly on the stroke object for sub-millisecond GPU redraws.
  - **Layout Reflow Elimination**: Caches `getBoundingClientRect()` on `pointerdown` and window resize, preventing browser layout thrashing during 120Hz/240Hz stylus movement.
- **`FloatingBoardOverlay.tsx`**:
  - Minimal, distraction-free header for the undocked floating board.
  - Left side: "Move" drag grip (`WebkitAppRegion: 'drag'`) to smoothly move the board over other tabs and applications.
  - Right side: Pin option (Always-on-Top toggle) and Close button (`✕`) to close/dock back to the full application.
  - **Dynamic Screen Positioning**: Controls automatically shift between the top and bottom of the board depending on which half of the screen the window occupies.
  - **Hover & Focus Auto-Hide**: Hidden by default (`opacity-0 pointer-events-none`). Smoothly reveals on hover or touch-focus. Instantly dismisses on window blur when the user clicks or switches to another app.
  - 100% of the canvas has zero controls, driven purely by gestures and shortcuts.
- **`MovableImage.tsx`**:
  - Rendered underneath ink strokes so stylus draws directly on top of pasted reference images.
  - Draggable, resizable (with aspect-ratio lock), rotatable, and supports duplicate/delete.
- **`MovableTextBox.tsx` & `TextBoxTypeModal.tsx`**:
  - Floating text and code snippet blocks.
  - Supports Markdown notes and syntax-highlighted code blocks (Monaco / Prism).

#### B. Layout & Navigation (`src/components/layout/`, `src/components/pages/`, `src/components/minimap/`)
- **`TitleBar.tsx`**: Custom frameless Electron header. Hosts brand badge (`v3`), File/Edit/View menus, batch selector, export trigger, theme toggle, and window caption controls.
- **`PageNavigationHUD.tsx`**: Compact floating pill in top-left showing current page number, total pages, prev/next arrows, and new page prompt.
- **`PageDrawer.tsx`**: Slide-out drawer with thumbnail previews of all pages in the current batch. Supports page reordering, duplication, deletion, and renaming.
- **`NewPageModal.tsx`**: Modal for creating new pages with specific lesson topics.
- **`Minimap.tsx`**: Interactive miniature overview of the infinite whiteboard canvas with viewport indicator.

#### C. Batches & Storage Hub (`src/components/batches/`)
- **`BatchesAndFilesDrawer.tsx`**: Dedicated slide-out hub listing all classroom batches and all lesson files (`.board`, `.html`) stored locally on the PC.
- **`BatchManagerModal.tsx`**: Modal for creating, renaming, and switching batches.

#### D. Toolbar & Colors (`src/components/toolbar/`)
- **`Toolbar.tsx`**: Floating bottom inking toolbar with tools (pen, pencil, highlighter, eraser, hand, shapes, text), stroke width slider, color palette, undo/redo, code highlight toggle, auto-snap, pin/auto-hide toggle, and Undock pop-up button.
- **`VsCodeColorPicker.tsx`**: VS Code style color palette with hue/saturation sliders and pinned color swatches.

#### E. Common & Modals (`src/components/common/`, `src/components/export/`, `src/components/syntax/`)
- **`LoadingScreen.tsx`**: Smooth zero-latency animated startup splash screen.
- **`SavingOverlay.tsx`**: Non-blocking indicator showing save status during manual export or app shutdown.
- **`SettingsModal.tsx`**: User preferences (pin toolbar, auto-snap shapes, quick tap gestures, navigation minimap).
- **`ShareModal.tsx`**: Dialog for exporting boards to standalone HTML, PDF, or raw JSON.
- **`ModelTrainerModal.tsx`**: Handwriting AI recognition trainer studio.

---

### 5. Core Engine (`src/core/`)
- **`core/storage/StorageManager.ts`**:
  - Manages persistence to Electron IPC and localStorage.
  - `saveActiveBatchOnly(workspace)`: Optimised routine autosave that persists only the active batch (~2–7 MB) and immediately aborts if inking is active (`isDrawingActive`).
  - `flushImmediate(workspace)`: Full blocking save called on application shutdown (`onBeforeQuit`).
- **`core/inking/Smoother.ts`**:
  - Smooth Bezier curve generation using `perfect-freehand`.
  - Polygon generation and rendering to 2D canvas contexts.
- **`core/inking/StrokeBuilder.ts`**:
  - Live point collector for active stylus strokes.
  - Implements Euclidean distance squared filter (`distSq < 2.25`) to drop high-frequency micro-jitter points.
- **`core/export/ExportManager.ts`**:
  - Generates standalone, offline single-file HTML lesson viewers.
  - Exports images to PNG/JPEG and renders vector prints for PDF generation.
- **`core/export/HtmlViewerGenerator.ts`**:
  - Template generator for standalone HTML files. Embeds CSS, interactive controls, and playback engine.
- **`core/canvas/CanvasController.ts` & `core/canvas/Viewport.ts`**:
  - Manages pan (`x`, `y`), zoom (clamped between 0.1x and 5.0x), and screen-to-board coordinate transforms.

---

## 🛠️ Build & Packaging Workflow

### Commands
```bash
# 1. Type-check and build React renderer + Electron main process:
npm run build

# 2. Package standalone Windows executable for Version 3:
npx electron-builder --win

# The packaged output will be generated in:
# release-v3/win-unpacked/ThunderBoard v3.exe
# release-v3/ThunderBoard v3 3.0.0.exe (Portable)
# release-v3/ThunderBoard v3 Setup 3.0.0.exe (Installer)
```

### Process Locking Precaution
If `electron-builder` fails with an `Access is denied` error on `release-v3/win-unpacked/`, it means an instance of `ThunderBoard v3.exe` is currently running. Terminate it via PowerShell before re-running:
```powershell
Get-Process | Where-Object { $_.Path -like "*release-v3*" } | Stop-Process -Force
```
