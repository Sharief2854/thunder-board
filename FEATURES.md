# ThunderBoard v3 — Features Specification & User Manual

Welcome to **ThunderBoard v3**, the ultimate offline-first, hardware-accelerated intelligent digital teaching whiteboard and classroom code canvas.

---

## 🌟 What's New in Version 3 (v3.0.0)

### 1. Undocked Floating Whiteboard (Google Meet Style PiP)
- **Overlay Floating Pop-up**: Pop out the whiteboard into a compact, floating picture-in-picture window that stays on top of ANY application, browser tab (Chrome, Edge), PDF reader, PowerPoint slides, or code editors.
- **Pure Canvas with Zero Clutter & Controls**:
  - The floating window strips away all menus, toolbars, buttons, and HUDs.
  - 100% pure drawing whiteboard driven entirely by shortcuts and gestures.
- **Hover & Touch-Focus Auto-Hide**:
  - **Hover to Reveal**: Controls remain completely hidden (`opacity-0 pointer-events-none`) by default for an unobstructed canvas. Hovering anywhere on the board smoothly fades them in.
  - **Touch & Click Focus**: Tapping or clicking anywhere on the board displays the buttons.
  - **Instant Blur Dismissal (Multi-App Switching)**: The instant you move your mouse off the board or click on another application (Chrome, VS Code, Slack, Word), the board detects window blur and immediately closes/hides the buttons completely.
  - Automatically detects the board's vertical position on your monitor.
  - **If the board is at the TOP of the screen**: The controls bar automatically moves to the **BOTTOM** of the board.
  - **If the board is at the BOTTOM of the screen**: The controls bar automatically moves to the **TOP** of the board.
  - Smooth animation (`transition-all duration-300`) as you drag the window across the screen.
- **Controls Layout**:
  - **Move Board (Left Side)**: Draggable handle (`-webkit-app-region: drag`) to smoothly reposition the board anywhere on screen without conflicting with pen drawing.
  - **Dynamic Tuck Arrow (Right Side)**: Direction-aware tuck button that points left (`ArrowLeftToLine`) when the board is on the left half of the monitor, and dynamically points right (`ArrowRightToLine`) when on the right half of the monitor.
  - **Pin Option (Right Side)**: Toggle Always-on-Top mode with one click.
  - **Close Button (Right Side)**: Clean `✕` button to instantly close/dock back to full window mode (or press `Esc` / `Ctrl+D`).
  - **Fixed Pixel Dimension Integrity**: Buttons and handles strictly maintain constant dimensions with zero scaling, zero growth on hover/click, and pure opacity transitions.
- **Samsung Edge Panel (Dedicated Transparent Edge Bezel Line)**:
  - **Zero-Box Bezel Line (Left & Right Screen Edges)**: Collapses the whiteboard into an ultra-clean, dedicated transparent window showing **strictly** the 4px wide glowing blue pill line attached flush against the screen edge.
  - **Persistent Windows Taskbar Presence**: Minimizes into the Windows Taskbar so the ThunderBoard app icon remains permanently visible in the taskbar. It never appears closed, and clicking either the taskbar icon OR the glowing edge line instantly summons the whiteboard.
  - **DPI-Calibrated Bezel Snapping**: Uses exact pixel coordinate alignment (`workArea.x + workArea.width - window.width`) so the right-edge line is pinned right against the physical screen bezel without getting clipped off-screen or creating phantom window gaps.
  - **No Background Boxes or Resizing**: Completely eliminates background cards, button outlines, and dimensional resizing.
  - **Freely Draggable Anywhere from Top to Bottom**: Click/touch and slide up or down anywhere along the screen edge to position the line at any vertical height.
  - **Click Line to Open**: Clicking the glowing line immediately and smoothly restores the full floating whiteboard directly at that position.
  - **Zero Desktop Obstruction**: Leaves your entire screen (browsers, code, videos) 100% visible and accessible.
- **Deep Dark Black Canvas & Zero-Dots Surface**:
  - **Pure OLED Deep Black (`#000000`)**: Complete pitch-black canvas eliminating all ambient backlight glow and eye strain.
  - **Zero Background Dots**: Stripped the dot grid from the canvas for a clean, distraction-free writing surface and improved rendering performance.
  - **High-Contrast Neon/Laser Palette**: Curated with 8 ultra-vivid colors designed specifically for pure black (`#ffffff` Pure White, `#00e5ff` Electric Cyan, `#00e676` Neon Green, `#ffd600` Sun Yellow, `#ff3366` Coral Red, `#ff6d00` Vivid Orange, `#b388ff` Neon Purple, `#ff4081` Hot Pink).
  - **Pure Dark Mode Only**: Light mode switching is completely disabled across the application.

---

## ✍️ Inking & Drawing Engine

### Hardware-Accelerated Responsive Inking
- **Multi-Layer High-DPI Rendering**:
  - Dual-canvas architecture: dedicated dynamic layer for real-time stroke preview and committed layer for permanent ink polygons.
  - Automatic adaptation to high-DPI (Retina / 4K) displays via `window.devicePixelRatio`.
- **Pre-Computed Polygon GPU Outline Caching**:
  - Strokes calculate smooth Bezier outlines once via `Smoother.computeOutline` and cache them in memory.
  - Full redraws and zoom/pan actions execute with instant sub-millisecond GPU draw calls (`Smoother.drawPolygon`).
- **Micro-Jitter Stylus Filtering**:
  - Integrated Euclidean distance squared filter (`distSq < 2.25`) filters redundant stylus jitter points, reducing point density by ~40% while preserving natural curves.
- **Pressure-Sensitive Drawing**:
  - Full support for Microsoft Surface Pen, Wacom, Apple Pencil, and touch styluses with simulated or hardware pressure curves.

### Real-Time Eraser
- **Zero-Lag Stroke Eraser**:
  - Erases entire strokes instantly as the eraser touches them.
  - Dynamic spatial point-to-segment distance checking (`pointToSegmentDistanceSq <= thresholdSq`) ensures instant response without slowing down as stroke counts grow.

---

## ⚡ Gestures & Ergonomic Shortcuts

### Strict Anchor Tap Gestures
- **Double-Click in Place → Cycle Pen Colors**:
  - Double-clicking or double-tapping quickly switches to the next color in the active palette.
  - Confined to a strict **10px anchor radius** from the initial tap so handwriting and dotting letters (e.g. 'i', 'j') never triggers false positives.
- **Triple-Click in Place → Toggle Pen & Eraser**:
  - Triple-clicking toggles between the active pen and the eraser instantly without reaching for a toolbar.
- **Pointer Drag Cancellation**:
  - If pointer movement exceeds **8px**, tap combos are immediately canceled and treated as drawing strokes.

### Keyboard Shortcuts
| Shortcut | Action | Context / Scope |
| :--- | :--- | :--- |
| `Ctrl+D` / `Ctrl+Shift+D` / `Alt+D` | **Toggle Pop-up Floating Board / Dock to Full** | In-app & Global |
| `Esc` | **Dock Floating Board back to Full Window** | When Floating |
| `Ctrl+Shift+E` / `Ctrl+Alt+E` | **Global Toggle: Tuck to Edge / Expand from Edge** | Global OS (Anywhere in Windows) |
| `Alt+E` | **Tuck to Screen Edge** | In-App (Both Full & Floating modes) |
| `Ctrl+E` | **Tuck to Screen Edge** *(In Floating Mode)* / Open Export *(In Full Mode)* | In-App |
| `Ctrl+Left` / `Ctrl+Right` | **Tuck to Left / Right Screen Edge** | When Floating |
| `Enter` / `Space` / `Arrows` | **Expand & Open Board from Edge** | Edge Panel Focused |
| `P` | Switch to Pen tool | In-App |
| `E` | Switch to Eraser tool | In-App |
| `H` | Switch to Pan (Hand) tool | In-App |
| `S` | Switch to Shape tool | In-App |
| `T` | Add Text / Code Box | In-App |
| `C` | Toggle Handwritten Code Syntax Highlighting | In-App |
| `Ctrl + Z` | Undo last stroke/action | In-App |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo action | In-App |
| `Ctrl + S` | Force instant atomic save to disk | In-App |
| `Ctrl + E` | Open Export & Sharing Studio (Full Window Mode) | In-App |
| `Ctrl + +` / `Ctrl + =` | Zoom In | In-App |
| `Ctrl + -` | Zoom Out | In-App |
| `Ctrl + 0` | Reset Zoom to 100% | In-App |
| `Ctrl + 9` | Fit all content to screen | In-App |
| `Page Up` / `Ctrl + [` | Previous Page | In-App |
| `Page Down` / `Ctrl + ]` | Next Page | In-App |

---

## 📚 Batches & Multi-Page Management

### Organized Classroom Batches
- **Batch Management**: Create, duplicate, rename, and organize classes into distinct batches (e.g., *Batch 24 - React Deep Dive*, *Python Core Morning*).
- **Infinite / Multi-Page System**:
  - Add unlimited pages per batch with custom lesson topics.
  - Page navigation drawer with live previews and reordering.
  - Quick HUD for page switching in the top corner.

---

## 💾 Storage & Performance Architecture

### Zero-Lag Isolated Autosave
- **Active-Batch Autosave**: Routine autosave saves only the active batch (~2–7 MB) rather than serializing all 100+ MB of workspace data.
- **Inking-Priority Deferral**: Autosave automatically aborts if drawing is active (`isDrawingActive`), ensuring 0ms input lag during writing.
- **Atomic Disk Writes**: Saves write to `.tmp` files and atomically rename to prevent board corruption even if power is abruptly cut.
- **Safe Version Migration**: v3 reads legacy data from v2 or v1 on first boot if no v3 data exists, but writes exclusively to `ThunderBoard v3/boards/`.

---

## 📤 Export & Sharing

### Standalone Interactive HTML Export
- **100% Offline Single-File HTML**: Export entire batches or single pages into self-contained HTML files with embedded vector strokes, images, and text.
- **Interactive Lesson Player**:
  - Includes dark/light mode toggle in exported HTML.
  - Full stroke playback mode for students to re-watch the lecture being drawn.
  - PDF export and print formatting built in.

---

## 🎨 Themes & Customization
- **Blackboard Theme**: Optimized for classroom projectors and eye comfort with dark slate background and fluorescent chalk colors.
- **Whiteboard Theme**: Crisp white background with marker colors (black, blue, red, green).
- **Movable & Resizable Images**: Paste images directly (`Ctrl+V`) from clipboard or file, reposition, scale, and draw ink notes on top.
- **Movable Text & Code Boxes**: Floating syntax-highlighted code blocks (JavaScript, Python, C++, HTML, SQL) with Prism/Monaco syntax themes.
