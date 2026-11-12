import { WhiteboardPage, Stroke, BoardThemeType, TextBoxElement, ImageElement } from '../../types/whiteboard';

export class HtmlViewerGenerator {
  /**
   * Generate a completely self-contained interactive offline HTML viewer for students
   * Includes a left-side topic navigation drawer for jumping quickly between topics!
   */
  static generateInteractiveHtml(
    batchName: string,
    subject: string,
    pages: WhiteboardPage[],
    strokes: Record<string, Stroke>,
    initialTheme: BoardThemeType = 'blackboard',
    textElements: Record<string, TextBoxElement> = {},
    imageElements: Record<string, ImageElement> = {}
  ): string {
    const dataJson = JSON.stringify({
      batchName,
      subject,
      pages,
      strokes,
      textElements: textElements || {},
      imageElements: imageElements || {},
      initialTheme,
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
  <title>${this.escapeHtml(batchName)} — ${this.escapeHtml(subject || 'Teaching Notes')}</title>
  <style>
    :root {
      --bg: #111317;
      --card-bg: #1a1d24;
      --card-hover: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.12);
      --accent: #38bdf8;
      --accent-bg: rgba(56, 189, 248, 0.15);
      --grid: rgba(255, 255, 255, 0.06);
    }
    .theme-whiteboard {
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --card-hover: rgba(0, 0, 0, 0.06);
      --text: #0f172a;
      --text-muted: #64748b;
      --border: rgba(0, 0, 0, 0.12);
      --accent: #2563eb;
      --accent-bg: rgba(37, 99, 235, 0.12);
      --grid: rgba(0, 0, 0, 0.06);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    header {
      height: 48px;
      background: var(--card-bg);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 30;
      flex-shrink: 0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 14px;
    }
    .badge {
      background: var(--accent-bg);
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .btn-toggle-sidebar {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-toggle-sidebar:hover {
      background: var(--card-hover);
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button, select {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    button:hover, select:hover {
      background: var(--card-hover);
    }
    .btn-primary {
      background: #2563eb;
      color: white;
      border: none;
    }
    .btn-primary:hover {
      background: #1d4ed8;
    }

    /* Main Workspace Layout (Sidebar + Canvas) */
    .main-layout {
      flex: 1;
      display: flex;
      overflow: hidden;
      position: relative;
    }

    /* Left Sidebar Navigation */
    .sidebar {
      width: 280px;
      min-width: 280px;
      background: var(--card-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: margin-left 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.22s ease;
      z-index: 25;
    }
    .sidebar.collapsed {
      margin-left: -280px;
      opacity: 0;
      pointer-events: none;
    }
    .sidebar-header {
      padding: 12px 14px 10px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-shrink: 0;
    }
    .sidebar-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .topic-counter-badge {
      background: var(--accent-bg);
      color: var(--accent);
      padding: 1px 7px;
      border-radius: 9999px;
      font-family: monospace;
      font-size: 11px;
    }
    .search-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .search-input:focus {
      border-color: var(--accent);
    }
    .topics-nav {
      flex: 1;
      overflow-y: auto;
      padding: 8px 6px;
    }
    .topic-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 8px;
      margin-bottom: 3px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s ease;
      color: var(--text);
      user-select: none;
      border-left: 3px solid transparent;
    }
    .topic-item:hover {
      background: var(--card-hover);
    }
    .topic-item.active {
      background: var(--accent-bg);
      color: var(--accent);
      font-weight: 600;
      border-left-color: var(--accent);
    }
    .topic-num {
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      opacity: 0.75;
      min-width: 22px;
      height: 22px;
      border-radius: 5px;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .topic-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #viewport-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      cursor: grab;
      touch-action: none;
    }
    #viewport-container:active {
      cursor: grabbing;
    }
    canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .page-nav-bar {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--card-bg);
      border: 1px solid var(--border);
      box-shadow: 0 12px 36px rgba(0,0,0,0.4);
      padding: 6px 12px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 30;
      font-size: 13px;
    }
    .topic-title {
      font-weight: 600;
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Interactive Floating Text & Code Elements Layer */
    #text-boxes-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 15;
    }
    .viewer-text-box {
      position: absolute;
      pointer-events: auto;
      border-radius: 8px;
      padding: 10px 14px;
      box-sizing: border-box;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.15);
      overflow: auto;
      user-select: text;
      transition: border-color 0.15s;
    }
    .theme-blackboard .viewer-text-box, .theme-chalkboard .viewer-text-box {
      background: rgba(15, 23, 42, 0.88);
      color: #f1f5f9;
      border: 1px solid rgba(255, 255, 255, 0.18);
    }
    .theme-whiteboard .viewer-text-box {
      background: rgba(255, 255, 255, 0.94);
      color: #0f172a;
      border: 1px solid rgba(0, 0, 0, 0.18);
    }
    .viewer-text-box.code-box {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .viewer-text-box.note-box {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .copy-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: inherit;
      opacity: 0;
      cursor: pointer;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: sans-serif;
      transition: opacity 0.15s, background 0.15s;
      z-index: 5;
    }
    .viewer-text-box:hover .copy-btn {
      opacity: 0.75;
    }
    .copy-btn:hover {
      opacity: 1 !important;
      background: rgba(255, 255, 255, 0.2);
    }
    .text-box-content {
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.45;
    }
    .token-keyword { color: #f43f5e; font-weight: bold; }
    .token-string { color: #34d399; }
    .token-number { color: #fbbf24; }
    .token-comment { color: #94a3b8; font-style: italic; }

    /* Print styles */
    @media print {
      header, .sidebar, .page-nav-bar, .copy-btn { display: none !important; }
      body, .main-layout, #viewport-container, canvas {
        width: 100% !important;
        height: 100% !important;
        position: static !important;
      }
      #text-boxes-layer {
        position: absolute !important;
      }
    }
  </style>
</head>
<body class="theme-${initialTheme}">
  <header>
    <div class="brand">
      <button id="btn-toggle-sidebar" class="btn-toggle-sidebar" title="Toggle Topics Menu">
        <span>☰</span>
        <span>Topics</span>
      </button>
      <span>🎓 ${this.escapeHtml(batchName)}</span>
      <span class="badge">${this.escapeHtml(subject || 'Notes')}</span>
    </div>

    <div class="controls">
      <button id="btn-theme" title="Switch Dark / Light theme">🌓 Theme</button>
      <button id="btn-reset" title="Reset Zoom (100%)">🔍 100%</button>
      <button id="btn-fit" title="Fit to Screen">📐 Fit</button>
      <button id="btn-print" class="btn-primary" title="Print or Save as High-Res PDF">🖨️ Print / PDF</button>
    </div>
  </header>

  <div class="main-layout">
    <!-- Left-Side Topics Navigation Sidebar -->
    <aside id="topics-sidebar" class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-title-row">
          <span>Course Topics</span>
          <span class="topic-counter-badge" id="topic-count">${pages.length} Pages</span>
        </div>
        <input type="text" id="topic-search" class="search-input" placeholder="Quick find topic..." />
      </div>
      <nav id="topics-list" class="topics-nav"></nav>
    </aside>

    <!-- Infinite Whiteboard Viewport Canvas -->
    <div id="viewport-container">
      <canvas id="board-canvas"></canvas>
      <div id="text-boxes-layer"></div>
    </div>
  </div>

  <!-- Bottom Page Navigation HUD -->
  <div class="page-nav-bar">
    <button id="btn-prev" title="Previous Page">◀ Prev</button>
    <span id="page-counter" style="font-family: monospace; font-weight: bold; color: var(--accent);">1 / ${pages.length}</span>
    <span id="topic-name" class="topic-title">${this.escapeHtml(pages[0]?.title || 'Page 1')}</span>
    <button id="btn-next" title="Next Page">Next ▶</button>
  </div>

  <script>
    const data = ${dataJson};
    let currentTheme = data.initialTheme || 'blackboard';
    let currentPageIndex = 0;
    let zoom = 1;
    let panX = 0;
    let panY = 0;

    const imageCache = {};
    function preloadImages() {
      const allImages = Object.values(data.imageElements || {});
      for (const imgEl of allImages) {
        if (!imageCache[imgEl.id] && imgEl.src) {
          const img = new Image();
          img.onload = function() {
            imageCache[imgEl.id] = img;
            render();
          };
          img.src = imgEl.src;
          imageCache[imgEl.id] = img;
        }
      }
    }

    const container = document.getElementById('viewport-container');
    const canvas = document.getElementById('board-canvas');
    const ctx = canvas.getContext('2d');

    const sidebar = document.getElementById('topics-sidebar');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const topicsListEl = document.getElementById('topics-list');
    const topicSearchEl = document.getElementById('topic-search');

    const topicNameEl = document.getElementById('topic-name');
    const pageCounterEl = document.getElementById('page-counter');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnTheme = document.getElementById('btn-theme');
    const btnReset = document.getElementById('btn-reset');
    const btnFit = document.getElementById('btn-fit');
    const btnPrint = document.getElementById('btn-print');

    function escapeHtmlText(str) {
      return (str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function renderTopicsNav(filter = '') {
      topicsListEl.innerHTML = '';
      const q = filter.toLowerCase().trim();
      data.pages.forEach((page, idx) => {
        const title = page.title || ('Page ' + (idx + 1));
        if (q && !title.toLowerCase().includes(q) && !(idx + 1).toString().includes(q)) {
          return;
        }

        const item = document.createElement('div');
        item.className = 'topic-item' + (idx === currentPageIndex ? ' active' : '');
        item.dataset.index = idx;
        item.innerHTML = '<span class="topic-num">' + (idx + 1) + '</span>' +
                         '<span class="topic-text" title="' + escapeHtmlText(title) + '">' +
                         escapeHtmlText(title) + '</span>';

        item.onclick = () => {
          currentPageIndex = idx;
          updatePageUI();
        };

        topicsListEl.appendChild(item);
      });
    }

    topicSearchEl.oninput = () => {
      renderTopicsNav(topicSearchEl.value);
    };

    btnToggleSidebar.onclick = () => {
      sidebar.classList.toggle('collapsed');
      setTimeout(resize, 240);
    };

    // Collapse on small mobile screens initially
    if (window.innerWidth < 768) {
      sidebar.classList.add('collapsed');
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      render();
    }

    window.addEventListener('resize', resize);

    function getCurrentPageStrokes() {
      const page = data.pages[currentPageIndex];
      if (!page) return [];
      return Object.values(data.strokes || {}).filter(s => s.pageId === page.id && !s.isErased);
    }

    function getCurrentPageTextBoxes() {
      const page = data.pages[currentPageIndex];
      if (!page) return [];
      return Object.values(data.textElements || {}).filter(t => t.pageId === page.id);
    }

    function getCurrentPageImages() {
      const page = data.pages[currentPageIndex];
      if (!page) return [];
      return Object.values(data.imageElements || {}).filter(img => img.pageId === page.id);
    }

    function highlightCode(code) {
      var escaped = escapeHtmlText(code);
      try {
        escaped = escaped.replace(new RegExp('(\\/\\/.*$)', 'gm'), '<span class="token-comment">$1</span>');
        escaped = escaped.replace(new RegExp('(&quot;[\\s\\S]*?&quot;|&#39;[\\s\\S]*?&#39;)', 'g'), '<span class="token-string">$1</span>');
        var kw = new RegExp('\\\\b(const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|new|async|await|try|catch|finally|switch|case|break|continue|typeof|interface|type|public|private|static|def|print|elif)\\\\b', 'g');
        escaped = escaped.replace(kw, '<span class="token-keyword">$1</span>');
        escaped = escaped.replace(new RegExp('\\\\b(\\\\d+)\\\\b', 'g'), '<span class="token-number">$1</span>');
      } catch (e) {}
      return escaped.split('\\n').join('<br/>');
    }

    function renderTextBoxes() {
      const layer = document.getElementById('text-boxes-layer');
      if (!layer) return;
      const textBoxes = getCurrentPageTextBoxes();
      layer.innerHTML = '';

      for (const box of textBoxes) {
        const screenX = box.x * zoom + panX;
        const screenY = box.y * zoom + panY;
        const screenW = (box.width || 260) * zoom;
        const screenH = (box.height || 120) * zoom;

        // Skip rendering if completely out of view
        if (screenX + screenW < -150 || screenX > container.clientWidth + 150 ||
            screenY + screenH < -150 || screenY > container.clientHeight + 150) {
          continue;
        }

        const div = document.createElement('div');
        div.className = 'viewer-text-box ' + (box.mode === 'code' ? 'code-box' : 'note-box');
        div.style.left = screenX + 'px';
        div.style.top = screenY + 'px';
        div.style.width = Math.max(120, screenW) + 'px';
        div.style.minHeight = Math.max(45, screenH) + 'px';
        div.style.fontSize = Math.max(9, (box.fontSize || 14) * zoom) + 'px';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.title = 'Copy text';
        copyBtn.textContent = '📋 Copy';
        const boxContent = box.content || '';
        copyBtn.onclick = (function(textToCopy, btn) {
          return function(e) {
            e.stopPropagation();
            if (navigator.clipboard) {
              navigator.clipboard.writeText(textToCopy);
              btn.textContent = '✓ Copied';
              setTimeout(function() { btn.textContent = '📋 Copy'; }, 2000);
            }
          };
        })(boxContent, copyBtn);
        div.appendChild(copyBtn);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'text-box-content';
        if (box.mode === 'code') {
          contentDiv.innerHTML = highlightCode(boxContent);
        } else {
          contentDiv.innerHTML = escapeHtmlText(boxContent).split('\\n').join('<br/>');
        }

        div.appendChild(contentDiv);
        layer.appendChild(div);
      }
    }

    function fitToScreen() {
      const strokes = getCurrentPageStrokes();
      const textBoxes = getCurrentPageTextBoxes();
      const images = getCurrentPageImages();
      if (strokes.length === 0 && textBoxes.length === 0 && images.length === 0) {
        zoom = 1;
        panX = 0;
        panY = 0;
        render();
        return;
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of strokes) {
        if (!s.boundingBox) continue;
        minX = Math.min(minX, s.boundingBox.minX);
        minY = Math.min(minY, s.boundingBox.minY);
        maxX = Math.max(maxX, s.boundingBox.maxX);
        maxY = Math.max(maxY, s.boundingBox.maxY);
      }

      for (const t of textBoxes) {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + (t.width || 260));
        maxY = Math.max(maxY, t.y + (t.height || 120));
      }

      for (const img of images) {
        minX = Math.min(minX, img.x);
        minY = Math.min(minY, img.y);
        maxX = Math.max(maxX, img.x + (img.width || 400));
        maxY = Math.max(maxY, img.y + (img.height || 300));
      }

      const w = maxX - minX || 800;
      const h = maxY - minY || 500;
      const availW = container.clientWidth - 100;
      const availH = container.clientHeight - 100;

      zoom = Math.min(1.5, Math.max(0.2, Math.min(availW / w, availH / h)));
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      panX = container.clientWidth / 2 - centerX * zoom;
      panY = container.clientHeight / 2 - centerY * zoom;
      render();
    }

    function render() {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const isDark = currentTheme === 'blackboard' || currentTheme === 'chalkboard';
      ctx.fillStyle = isDark ? '#111317' : '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid Dots
      const gridSize = 28 * zoom;
      if (gridSize >= 8) {
        ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
        const offX = ((panX * dpr) % (gridSize * dpr) + (gridSize * dpr)) % (gridSize * dpr);
        const offY = ((panY * dpr) % (gridSize * dpr) + (gridSize * dpr)) % (gridSize * dpr);
        for (let x = offX; x < canvas.width; x += gridSize * dpr) {
          for (let y = offY; y < canvas.height; y += gridSize * dpr) {
            ctx.beginPath();
            ctx.arc(x, y, 1.2 * dpr, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * panX, dpr * panY);

      // Render images under strokes
      const images = getCurrentPageImages();
      for (const imgEl of images) {
        const cachedImg = imageCache[imgEl.id];
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          try {
            ctx.drawImage(cachedImg, imgEl.x, imgEl.y, imgEl.width, imgEl.height);
          } catch (e) {}
        }
      }

      const strokes = getCurrentPageStrokes();
      for (const stroke of strokes) {
        if (stroke.pathOutline && stroke.pathOutline.length > 0) {
          ctx.save();
          ctx.fillStyle = stroke.color;
          if (stroke.tool === 'highlighter') ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.moveTo(stroke.pathOutline[0][0], stroke.pathOutline[0][1]);
          for (let i = 1; i < stroke.pathOutline.length; i++) {
            ctx.lineTo(stroke.pathOutline[i][0], stroke.pathOutline[i][1]);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else if (stroke.points && stroke.points.length > 0) {
          ctx.save();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width || 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          if (stroke.tool === 'highlighter') ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      // Render all floating text and code elements for the current page
      renderTextBoxes();
    }

    function updatePageUI() {
      const page = data.pages[currentPageIndex];
      topicNameEl.textContent = page?.title || ('Page ' + (currentPageIndex + 1));
      pageCounterEl.textContent = (currentPageIndex + 1) + ' / ' + data.pages.length;
      btnPrev.disabled = currentPageIndex === 0;
      btnNext.disabled = currentPageIndex === data.pages.length - 1;

      // Update active state in sidebar
      const items = topicsListEl.querySelectorAll('.topic-item');
      items.forEach(el => {
        if (Number(el.dataset.index) === currentPageIndex) {
          el.classList.add('active');
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
          el.classList.remove('active');
        }
      });

      fitToScreen();
    }

    btnPrev.onclick = () => { if (currentPageIndex > 0) { currentPageIndex--; updatePageUI(); } };
    btnNext.onclick = () => { if (currentPageIndex < data.pages.length - 1) { currentPageIndex++; updatePageUI(); } };

    btnTheme.onclick = () => {
      currentTheme = currentTheme === 'whiteboard' ? 'blackboard' : 'whiteboard';
      document.body.className = 'theme-' + currentTheme;
      render();
    };

    btnReset.onclick = () => { zoom = 1; panX = 0; panY = 0; render(); };
    btnFit.onclick = fitToScreen;
    btnPrint.onclick = () => window.print();

    // Mouse & Touch Pan/Zoom
    let isDragging = false;
    let startX = 0, startY = 0;

    container.onpointerdown = e => {
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      container.setPointerCapture(e.pointerId);
    };

    container.onpointermove = e => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      render();
    };

    container.onpointerup = container.onpointercancel = () => {
      isDragging = false;
    };

    container.onwheel = e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - panX) / zoom;
      const worldY = (mouseY - panY) / zoom;

      zoom = Math.min(5, Math.max(0.1, zoom * factor));
      panX = mouseX - worldX * zoom;
      panY = mouseY - worldY * zoom;
      render();
    };

    // Keyboard navigation
    window.onkeydown = e => {
      if (document.activeElement === topicSearchEl) return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') btnPrev.click();
      if (e.key === 'ArrowRight' || e.key === 'PageDown') btnNext.click();
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) btnReset.click();
    };

    preloadImages();
    renderTopicsNav();

    setTimeout(() => {
      resize();
      fitToScreen();
    }, 50);
  </script>
</body>
</html>`;
  }

  private static escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
