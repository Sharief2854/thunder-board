import { BoundingBox, Stroke, TextBoxElement, ImageElement, ViewportTransform } from '../../types/whiteboard';
import { Viewport } from './Viewport';

export class CanvasController {
  static MIN_ZOOM = 0.1;
  static MAX_ZOOM = 5.0;

  /**
   * Compute zoom anchored at mouse cursor (clientX, clientY)
   */
  static zoomAtPoint(
    current: ViewportTransform,
    clientX: number,
    clientY: number,
    rect: DOMRect,
    zoomFactor: number
  ): ViewportTransform {
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const newZoom = Math.min(
      this.MAX_ZOOM,
      Math.max(this.MIN_ZOOM, current.zoom * zoomFactor)
    );

    if (newZoom === current.zoom) return current;

    // World coordinate under cursor before zoom
    const worldBefore = Viewport.screenToWorld(screenX, screenY, current);

    // New translation such that worldBefore stays at screenX, screenY
    const newX = screenX - worldBefore.x * newZoom;
    const newY = screenY - worldBefore.y * newZoom;

    return {
      x: newX,
      y: newY,
      zoom: newZoom,
    };
  }

  /**
   * Calculate bounding box enclosing all strokes, movable text/code elements, and image elements
   */
  static getContentBoundingBox(
    strokes: Stroke[],
    textElements?: TextBoxElement[],
    imageElements?: ImageElement[]
  ): BoundingBox | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasContent = false;

    for (const s of strokes) {
      if (s.isErased || !s.boundingBox) continue;
      hasContent = true;
      minX = Math.min(minX, s.boundingBox.minX);
      minY = Math.min(minY, s.boundingBox.minY);
      maxX = Math.max(maxX, s.boundingBox.maxX);
      maxY = Math.max(maxY, s.boundingBox.maxY);
    }

    if (textElements) {
      for (const t of textElements) {
        hasContent = true;
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + (t.width || 240));
        maxY = Math.max(maxY, t.y + (t.height || 120));
      }
    }

    if (imageElements) {
      for (const img of imageElements) {
        hasContent = true;
        minX = Math.min(minX, img.x);
        minY = Math.min(minY, img.y);
        maxX = Math.max(maxX, img.x + (img.width || 400));
        maxY = Math.max(maxY, img.y + (img.height || 300));
      }
    }

    if (!hasContent) return null;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(10, maxX - minX),
      height: Math.max(10, maxY - minY),
    };
  }

  /**
   * Fit all content into view with comfortable margins
   */
  static fitToScreen(
    strokes: Stroke[],
    canvasWidth: number,
    canvasHeight: number,
    padding = 80,
    textElements?: TextBoxElement[],
    imageElements?: ImageElement[]
  ): ViewportTransform {
    const box = this.getContentBoundingBox(strokes, textElements, imageElements);
    if (!box) {
      return { x: 0, y: 0, zoom: 1 };
    }

    const availableWidth = Math.max(100, canvasWidth - padding * 2);
    const availableHeight = Math.max(100, canvasHeight - padding * 2);

    const zoomX = availableWidth / box.width;
    const zoomY = availableHeight / box.height;
    const newZoom = Math.min(1.5, Math.max(this.MIN_ZOOM, Math.min(zoomX, zoomY)));

    // Center the content box in the screen
    const centerX = (box.minX + box.maxX) / 2;
    const centerY = (box.minY + box.maxY) / 2;

    const screenCenterX = canvasWidth / 2;
    const screenCenterY = canvasHeight / 2;

    return {
      x: screenCenterX - centerX * newZoom,
      y: screenCenterY - centerY * newZoom,
      zoom: newZoom,
    };
  }
}
