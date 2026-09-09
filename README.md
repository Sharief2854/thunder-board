# ThunderBoard ⚡

> **The Intelligent Desktop Teaching Board & Code Canvas for Developers, Educators, and Presenters.**

![ThunderBoard Banner](public/icon.png)

**ThunderBoard** is a modern, high-performance, offline-first desktop whiteboard designed for technical instructors, developers, and visual thinkers. Built with React, TypeScript, Vite, Tailwind CSS, and Electron, it combines ultra-fluid freehand drawing with interactive syntax-highlighted code cards, a VS Code-style color studio, customizable toolbar pinning, geometric shape recognition, and universal offline student lecture exports.

---

## ✨ Features Overview

### 🎨 VS Code-Style Interactive Color Studio
- **2D Saturation / Value (Brightness) Box**: Interactive 2D color canvas with fluid cursor/reticle tracking for picking exact tints, shades, and tones.
- **Rainbow Hue Spectrum Slider (0° – 360°)**: Smooth color wheel slider with live degree readouts.
- **Format Switcher (HEX / RGB / HSL)**: Click the format badge to cycle between **HEX**, **RGB**, and **HSL** displays, just like in Visual Studio Code.
- **Direct Hex Editor**: Paste or type custom hex color codes directly with instant validation and a one-click clipboard copy button.
- **24-Color Curated Vibrant Palette**: Quick-access grid of 24 solid, rich colors tailored for whiteboard contrast without harsh gradients.

### 📌 Custom Color Pinning (Max 4 Colors)
- **Pin to Toolbar Tab**: Pin up to **4 custom colors** directly onto the floating toolbar tab alongside the default theme swatches.
- **One-Click Ink Switch**: Select your pinned colors instantly without reopening the color picker.
- **Smart Usage Counter & Guard**: Displays `(X/4)` count and disables the pin button when the 4-color limit is reached to prevent toolbar clutter.
- **Instant Unpinning**: Hover over any pinned swatch on the toolbar to reveal a quick red `×` unpin button.
- **Local Persistence**: Pinned colors are safely preserved in `localStorage` across application restarts.

### 🖋️ Distraction-Free Inking & Clean Aesthetics
- **Zero-Latency Inking**: Smooth Bezier curve interpolation with customizable stroke sizes and pressure sensitivity.
- **Pure Obsidian Blackboard & Clean Whiteboard**: Distraction-free solid backgrounds with all white grid dots removed for maximum visual focus.
- **Strict Solid UI Colors**: Professional flat design without distracting gradients across toolbars, dialogs, and title bars.
- **Multi-Tool Support**: Pen, Pencil, Translucent Highlighter, and Stroke/Point Eraser.
- **Collapsible Floating Toolbar**: Stays docked or expands on hover; can be pinned permanently or dragged anywhere on the screen.

### 🪟 Desktop Menu Bar & Settings Studio
- **Top Application Menus**: Traditional desktop menu bar with `File`, `Edit`, `View`, and `Settings` menus.
- **Settings Modal**:
  - **Auto-Snap Shapes**: Toggle automatic geometric shape snapping on or off.
  - **Navigation Minimap**: Toggle the bottom-corner canvas navigator on or off.
  - **Toolbar Pinning**: Configure default open/collapse behavior on mouse leave.
  - **Auto-Save Location**: Configure a continuous lecture export folder on your local drive.

### 💻 Movable & Resizable Text and Code Cards
- **Lecture Notes & Syntax Code Boxes**: Add notes and formatted code blocks anywhere on the canvas.
- **Syntax Highlighting**: Supports JavaScript, TypeScript, Python, HTML, CSS, JSON, and more via PrismJS.
- **Clean Uniform Borders**: Border styles match the board theme with clean typography and no bulky chip badges.
- **Pan & Zoom Synchronized**: Cards scale and translate seamlessly with canvas navigation.

### 🧠 Handwritten Code Highlighter & Model Calibration
- **Turned OFF by Default**: Inking behaves completely normally out of the box without unexpected syntax recoloring.
- **Toggle On-Demand**: Enable handwritten code syntax highlighting at any time with the toolbar <kbd>{;}</kbd> icon or the <kbd>C</kbd> shortcut.
- **Model Trainer Studio**: Calibrate the built-in point-cloud model to adapt to your personal handwriting style for symbols, curly braces `{ }`, HTML tags `<div>`, and language keywords.

### 📐 Smart Geometric Shapes
- **Freehand Shape Recognition**: Draw rough loops, boxes, and triangles—ThunderBoard automatically snaps them into clean vector shapes.
- **Shape Inserter**: Direct vector insertion for Rectangles, Circles/Ellipses, Triangles, Diamonds, Stars, Lines, and Directional Arrows.

### 📦 Universal Export & Interactive Student Presentations
- **Interactive Offline HTML Lectures**:
  - Exports a single standalone `.html` file that students can open in any browser without installing software.
  - Includes all drawing strokes, pan/zoom scaling, and movable text/code boxes.
  - Features an instant student **📋 Copy** button on every code card with visual `✓ Copied` feedback.
- **Continuous Batch Folder Auto-Save**: Automatically keeps lecture notes updated in your designated course folder.
- **High-Resolution 4K PNG & Vector SVG**: Export crisp raster graphics or scalable vector assets for slides and handouts.
- **Editable Lesson Packages (`.thunderboard`)**: Save and share entire multi-page lesson batches across computers.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
| :--- | :--- |
| <kbd>P</kbd> | Pen Tool |
| <kbd>E</kbd> | Eraser Tool |
| <kbd>T</kbd> | Insert Text / Code Box |
| <kbd>S</kbd> | Shape Tool |
| <kbd>C</kbd> | Toggle Handwritten Code Highlighter (Default: OFF) |
| <kbd>H</kbd> / <kbd>Space</kbd> + Drag | Pan Canvas |
| <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo |
| <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> | Redo |
| <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save / Export Lesson |
| <kbd>Ctrl</kbd> + Scroll | Zoom In / Zoom Out |
| <kbd>Ctrl</kbd> + <kbd>0</kbd> | Reset Zoom to 100% |
| <kbd>F11</kbd> | Toggle Fullscreen |

---

## 🛠️ Tech Stack & Architecture

- **Desktop Framework**: [Electron](https://www.electronjs.org/)
- **UI & Components**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build System**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Syntax Parsing**: [PrismJS](https://prismjs.com/)
- **Persistence**: LocalStorage + Native Electron IPC Filesystem Engine

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed on your system
- npm or yarn

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/thunderboard.git
   cd thunderboard
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Launch in Development Mode**:
   ```bash
   npm run dev
   ```
   In a second terminal window (or start with electron):
   ```bash
   npx electron .
   ```

4. **Build Production Desktop Package**:
   ```bash
   npm run build
   ```

---

## 📁 Project Directory Structure

```
smart-board/
├── electron/              # Electron main process & IPC preload bridge
│   ├── main.ts            # Window management, application menus, dialogs
│   └── preload.ts         # Secure context bridge (window.thunderBoardAPI)
├── public/                # App icon assets and static files
│   └── icon.png           # ThunderBoard lightning application icon
├── src/
│   ├── app/               # Root App component and canvas orchestration
│   ├── components/
│   │   ├── canvas/        # Main whiteboard canvas and text/shape overlays
│   │   ├── layout/        # TitleBar, desktop menus, and navigation
│   │   ├── toolbar/       # Floating toolbar, VsCodeColorPicker, size popovers
│   │   ├── settings/      # SettingsModal (app options and auto-save paths)
│   │   ├── pages/         # Page drawer and lecture batch organizer
│   │   └── export/        # ShareModal (HTML, PNG, SVG, PDF, .thunderboard)
│   ├── core/
│   │   ├── export/        # HtmlViewerGenerator, ExportManager
│   │   ├── shapes/        # Geometric recognition and snapping algorithms
│   │   ├── storage/       # Multi-batch storage and filesystem sync
│   │   └── syntax/        # Handwriting recognition & model calibration
│   └── types/             # Whiteboard and theme TypeScript declarations
├── .gitignore             # Git ignore definitions
├── package.json           # Dependencies and build scripts
└── README.md              # Project documentation
```

---

## 📄 License

Distributed under the MIT License.
