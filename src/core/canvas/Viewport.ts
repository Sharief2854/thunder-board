import { BoundingBox, ViewportTransform } from '../../types/whiteboard';

export class Viewport {
  static screenToWorld(
    screenX: number,
    screenY: number,
    transform: ViewportTransform
  ): { x: number; y: number } {
    return {
      x: (screenX - transform.x) / transform.zoom,
      y: (screenY - transform.y) / transform.zoom,
    };
  }

  static worldToScreen(
    worldX: number,
    worldY: number,
    transform: ViewportTransform
  ): { x: number; y: number } {
    return {
      x: worldX * transform.zoom + transform.x,
      y: worldY * transform.zoom + transform.y,
    };
  }

  static getVisibleWorldBounds(
    canvasWidth: number,
    canvasHeight: number,
    transform: ViewportTransform
  ): BoundingBox {
    const topLeft = this.screenToWorld(0, 0, transform);
    const bottomRight = this.screenToWorld(canvasWidth, canvasHeight, transform);

    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxX: Math.max(topLeft.x, bottomRight.x),
      maxY: Math.max(topLeft.y, bottomRight.y),
      width: Math.abs(bottomRight.x - topLeft.x),
      height: Math.abs(bottomRight.y - topLeft.y),
    };
  }

  static isBoxInViewport(
    box: BoundingBox,
    canvasWidth: number,
    canvasHeight: number,
    transform: ViewportTransform
  ): boolean {
    const worldBounds = this.getVisibleWorldBounds(canvasWidth, canvasHeight, transform);
    return !(
      box.maxX < worldBounds.minX ||
      box.minX > worldBounds.maxX ||
      box.maxY < worldBounds.minY ||
      box.minY > worldBounds.maxY
    );
  }
}
