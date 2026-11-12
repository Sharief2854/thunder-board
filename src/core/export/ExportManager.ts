import { WhiteboardDocument, WhiteboardPage, Stroke, BoardThemeType, TextBoxElement, ImageElement } from '../../types/whiteboard';
import { WHITEBOARD_THEME, BLACKBOARD_THEME } from '../../types/theme';
import { Smoother } from '../inking/Smoother';
import { CanvasController } from '../canvas/CanvasController';
import { HtmlViewerGenerator } from './HtmlViewerGenerator';

export class ExportManager {
  /**
   * Render a specific page to an offscreen canvas at crystal-clear 4K resolution (3840 x 2160)
   */
  static async renderPageToCanvas(
    page: WhiteboardPage,
    strokesMap: Record<string, Stroke>,
    theme: BoardThemeType,
    exportWidth = 3840,
    exportHeight = 2160,
    textElementsMap?: Record<string, TextBoxElement>,
    imageElementsMap?: Record<string, ImageElement>
  ): Promise<HTMLCanvasElement> {
    const pageStrokes = Object.values(strokesMap).filter(
      s => s.pageId === page.id && !s.isErased
    );
    const pageTextElements = Object.values(textElementsMap || {}).filter(
      t => t.pageId === page.id
    );
    const pageImageElements = Object.values(imageElementsMap || {}).filter(
      t => t.pageId === page.id
    );

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const themeConfig = theme === 'whiteboard' ? WHITEBOARD_THEME : BLACKBOARD_THEME;
    const isDark = theme === 'blackboard' || theme === 'chalkboard';

    // Background
    ctx.fillStyle = themeConfig.backgroundColor;
    ctx.fillRect(0, 0, exportWidth, exportHeight);

    // Subtle grid dots at 4K scale
    if (themeConfig.gridColor && themeConfig.gridColor !== 'transparent') {
      const gridSize = 56;
      ctx.fillStyle = themeConfig.gridColor;
      for (let x = 28; x < exportWidth; x += gridSize) {
        for (let y = 28; y < exportHeight; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Fit content (strokes, text elements, and images) to export frame with comfortable padding
    const transform = CanvasController.fitToScreen(pageStrokes, exportWidth, exportHeight, 140, pageTextElements, pageImageElements);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.zoom, transform.zoom);

    // Render images under strokes
    if (pageImageElements.length > 0) {
      const loadedImages = await Promise.all(
        pageImageElements.map(
          elem =>
            new Promise<HTMLImageElement | null>(resolve => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve(img);
              img.onerror = () => resolve(null);
              img.src = elem.src;
            })
        )
      );

      for (let i = 0; i < pageImageElements.length; i++) {
        const elem = pageImageElements[i];
        const img = loadedImages[i];
        if (img) {
          ctx.save();
          ctx.drawImage(img, elem.x, elem.y, elem.width, elem.height);
          ctx.restore();
        }
      }
    }

    // Render strokes
    for (const stroke of pageStrokes) {
      if (stroke.pathOutline && stroke.pathOutline.length > 0) {
        ctx.save();
        ctx.fillStyle = stroke.color;
        if (stroke.tool === 'highlighter') {
          ctx.globalAlpha = 0.35;
        }
        Smoother.drawPolygon(ctx, stroke.pathOutline);
        ctx.restore();
      } else {
        Smoother.renderStroke(ctx, stroke.points, stroke.tool, stroke.color, stroke.width);
      }
    }

    // Render floating text & code boxes
    for (const elem of pageTextElements) {
      ctx.save();
      const x = elem.x;
      const y = elem.y;
      const w = elem.width || 280;
      const h = elem.height || 140;
      const r = 8;

      // Card background & uniform normal border
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Content lines (clean normal text without chip)
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      const fontSize = Math.max(12, elem.fontSize || 16);
      ctx.font = `${fontSize}px ${elem.mode === 'code' ? 'ui-monospace, SFMono-Regular, Consolas, monospace' : '-apple-system, sans-serif'}`;
      const lines = (elem.content || '').split('\n');
      const lineHeight = fontSize * 1.45;
      let lineY = y + 26;
      for (const line of lines) {
        if (lineY > y + h - 10) break;
        ctx.fillText(line, x + 14, lineY);
        lineY += lineHeight;
      }

      ctx.restore();
    }

    ctx.restore();

    // High-res footer
    ctx.fillStyle = themeConfig.textColor;
    ctx.globalAlpha = 0.5;
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.fillText(`${page.title} — ThunderBoard`, 60, exportHeight - 40);

    return canvas;
  }

  /**
   * Copy current page as PNG image directly to system clipboard
   */
  static async copyPageToClipboard(
    page: WhiteboardPage,
    strokesMap: Record<string, Stroke>,
    theme: BoardThemeType,
    textElementsMap?: Record<string, TextBoxElement>,
    imageElementsMap?: Record<string, ImageElement>
  ): Promise<boolean> {
    try {
      const canvas = await this.renderPageToCanvas(page, strokesMap, theme, 2560, 1440, textElementsMap, imageElementsMap);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return false;

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to copy image to clipboard:', err);
      return false;
    }
  }

  /**
   * Save current page as 4K Ultra-HD PNG file download
   */
  static async savePageAsPng(
    page: WhiteboardPage,
    strokesMap: Record<string, Stroke>,
    theme: BoardThemeType,
    textElementsMap?: Record<string, TextBoxElement>,
    imageElementsMap?: Record<string, ImageElement>
  ): Promise<boolean> {
    const canvas = await this.renderPageToCanvas(page, strokesMap, theme, 3840, 2160, textElementsMap, imageElementsMap);
    const dataUrl = canvas.toDataURL('image/png');
    const safeTitle = page.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const link = document.createElement('a');
    link.download = `${safeTitle}_4k.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }

  /**
   * Export as Infinite Scalable Vector Graphics (SVG) with 0% blur or pixelation
   */
  static savePageAsSvg(
    page: WhiteboardPage,
    strokesMap: Record<string, Stroke>,
    theme: BoardThemeType,
    textElementsMap?: Record<string, TextBoxElement>,
    imageElementsMap?: Record<string, ImageElement>
  ): boolean {
    const pageStrokes = Object.values(strokesMap).filter(
      s => s.pageId === page.id && !s.isErased
    );
    const pageTextElements = Object.values(textElementsMap || {}).filter(
      t => t.pageId === page.id
    );
    const pageImageElements = Object.values(imageElementsMap || {}).filter(
      i => i.pageId === page.id
    );

    const themeConfig = theme === 'whiteboard' ? WHITEBOARD_THEME : BLACKBOARD_THEME;
    const isDark = theme === 'blackboard' || theme === 'chalkboard';

    const box = CanvasController.getContentBoundingBox(pageStrokes, pageTextElements, pageImageElements) || {
      minX: 0,
      minY: 0,
      maxX: 1920,
      maxY: 1080,
      width: 1920,
      height: 1080,
    };

    const pad = 60;
    const viewBox = `${box.minX - pad} ${box.minY - pad} ${box.width + pad * 2} ${box.height + pad * 2}`;

    let svgImages = '';
    for (const img of pageImageElements) {
      svgImages += `<image href="${img.src}" x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" />\n`;
    }

    let svgPaths = '';
    for (const stroke of pageStrokes) {
      const opacity = stroke.tool === 'highlighter' ? '0.35' : '1';
      if (stroke.pathOutline && stroke.pathOutline.length > 0) {
        let d = `M ${stroke.pathOutline[0][0]} ${stroke.pathOutline[0][1]}`;
        for (let i = 1; i < stroke.pathOutline.length; i++) {
          d += ` L ${stroke.pathOutline[i][0]} ${stroke.pathOutline[i][1]}`;
        }
        d += ' Z';
        svgPaths += `<path d="${d}" fill="${stroke.color}" opacity="${opacity}" />\n`;
      } else if (stroke.points && stroke.points.length > 0) {
        let d = `M ${stroke.points[0].x} ${stroke.points[0].y}`;
        for (let i = 1; i < stroke.points.length; i++) {
          d += ` L ${stroke.points[i].x} ${stroke.points[i].y}`;
        }
        svgPaths += `<path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width || 4}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />\n`;
      }
    }

    let svgTextElements = '';
    for (const elem of pageTextElements) {
      const bg = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.94)';
      const stroke = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.18)';
      const textColor = isDark ? '#f8fafc' : '#0f172a';
      const w = elem.width || 280;
      const h = elem.height || 140;

      svgTextElements += `<g transform="translate(${elem.x}, ${elem.y})">
        <rect width="${w}" height="${h}" rx="8" fill="${bg}" stroke="${stroke}" stroke-width="1.5" />`;

      const lines = (elem.content || '').split('\n');
      const fontSize = Math.max(12, elem.fontSize || 16);
      const lineHeight = fontSize * 1.45;
      let lineY = 26;
      for (const line of lines) {
        if (lineY > h - 10) break;
        const escaped = (line || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        svgTextElements += `<text x="14" y="${lineY}" font-family="${elem.mode === 'code' ? 'monospace' : 'sans-serif'}" font-size="${fontSize}" fill="${textColor}">${escaped}</text>`;
        lineY += lineHeight;
      }
      svgTextElements += `</g>\n`;
    }

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">
  <rect x="${box.minX - pad}" y="${box.minY - pad}" width="${box.width + pad * 2}" height="${box.height + pad * 2}" fill="${themeConfig.backgroundColor}" />
  ${svgImages}
  ${svgPaths}
  ${svgTextElements}
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = page.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    link.download = `${safeTitle}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  /**
   * Export Entire Batch as an Interactive Standalone HTML Web App for Students (0 install, opens on any phone/laptop)
   */
  static async exportInteractiveHtmlViewer(
    batchName: string,
    subject: string,
    pages: WhiteboardPage[],
    strokesMap: Record<string, Stroke>,
    theme: BoardThemeType,
    textElementsMap: Record<string, TextBoxElement> = {},
    imageElementsMap: Record<string, ImageElement> = {}
  ): Promise<boolean> {
    const html = HtmlViewerGenerator.generateInteractiveHtml(
      batchName,
      subject,
      pages,
      strokesMap,
      theme,
      textElementsMap,
      imageElementsMap
    );

    const safeTitle = batchName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `${safeTitle}_notes.html`;

    if (window.smartBoardAPI) {
      const res = await window.smartBoardAPI.exportFile(filename, html);
      return !res.canceled;
    }

    // Web download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  /**
   * Export all pages as ThunderBoard Lesson package (.thunderboard / .chalkbyte / .json)
   */
  static async exportLessonPackage(doc: WhiteboardDocument): Promise<boolean> {
    const payload = JSON.stringify(doc, null, 2);
    const safeTitle = doc.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const filename = `${safeTitle}.thunderboard`;

    if (window.smartBoardAPI) {
      const res = await window.smartBoardAPI.exportFile(filename, payload);
      return !res.canceled;
    }

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  /**
   * Import a ThunderBoard Lesson package file
   */
  static async importLessonPackage(): Promise<WhiteboardDocument | null> {
    if (window.smartBoardAPI) {
      const res = await window.smartBoardAPI.importFile();
      if (!res.canceled && res.content) {
        return JSON.parse(res.content) as WhiteboardDocument;
      }
      return null;
    }

    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.sblesson,.json';
      input.onchange = async e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const text = await file.text();
          try {
            const doc = JSON.parse(text) as WhiteboardDocument;
            resolve(doc);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }
}
