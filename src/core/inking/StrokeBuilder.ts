import { BoundingBox, InkPoint, Stroke, StrokeTool, ViewportTransform } from '../../types/whiteboard';
import { Viewport } from '../canvas/Viewport';
import { Smoother } from './Smoother';

export class StrokeBuilder {
  private pageId: string;
  private tool: StrokeTool;
  private color: string;
  private width: number;
  private points: InkPoint[] = [];
  private minX = Infinity;
  private minY = Infinity;
  private maxX = -Infinity;
  private maxY = -Infinity;
  private startTime = 0;

  constructor(pageId: string, tool: StrokeTool, color: string, width: number) {
    this.pageId = pageId;
    this.tool = tool;
    this.color = color;
    this.width = width;
    this.startTime = Date.now();
  }

  /**
   * Add a raw pointer coordinate and transform to world coordinates
   */
  addPointFromEvent(
    e: PointerEvent,
    rect: DOMRect,
    transform: ViewportTransform
  ): InkPoint {
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = Viewport.screenToWorld(screenX, screenY, transform);

    // Micro-jitter filtering: ignore duplicate/micro points that cause polygon facet noise
    if (this.points.length > 0) {
      const last = this.points[this.points.length - 1];
      const dx = world.x - last.x;
      const dy = world.y - last.y;
      // Fast squared distance check avoids Math.hypot sqrt overhead and filters sub-pixel duplicates
      if (dx * dx + dy * dy < 1.2) {
        return last;
      }
    }

    // Normalize and smooth pressure
    let rawPressure = e.pressure;
    if (e.pointerType === 'mouse' && rawPressure === 0) {
      rawPressure = 0.5;
    } else if (rawPressure === 0) {
      rawPressure = 0.5;
    }

    // Exponential moving average for pressure to eliminate hardware sensor noise
    let smoothedPressure = rawPressure;
    if (this.points.length > 0) {
      const prevPressure = this.points[this.points.length - 1].pressure || 0.5;
      smoothedPressure = prevPressure * 0.3 + rawPressure * 0.7;
    }

    const point: InkPoint = {
      x: world.x,
      y: world.y,
      pressure: smoothedPressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      timestamp: Date.now(),
    };

    this.points.push(point);

    // Update bounding box
    this.minX = Math.min(this.minX, world.x);
    this.minY = Math.min(this.minY, world.y);
    this.maxX = Math.max(this.maxX, world.x);
    this.maxY = Math.max(this.maxY, world.y);

    return point;
  }

  /**
   * Extract all high-frequency coalesced events from PointerEvent
   */
  addCoalescedEvents(
    e: PointerEvent,
    rect: DOMRect,
    transform: ViewportTransform
  ): void {
    if (typeof e.getCoalescedEvents === 'function') {
      const coalesced = e.getCoalescedEvents();
      if (coalesced && coalesced.length > 0) {
        for (const ce of coalesced) {
          this.addPointFromEvent(ce, rect, transform);
        }
        return;
      }
    }
    // Fallback to single event
    this.addPointFromEvent(e, rect, transform);
  }

  getPoints(): InkPoint[] {
    return this.points;
  }

  getBoundingBox(): BoundingBox {
    const pad = this.width * 2;
    return {
      minX: this.minX - pad,
      minY: this.minY - pad,
      maxX: this.maxX + pad,
      maxY: this.maxY + pad,
      width: Math.max(0, this.maxX - this.minX + pad * 2),
      height: Math.max(0, this.maxY - this.minY + pad * 2),
    };
  }

  getTool(): StrokeTool {
    return this.tool;
  }

  /**
   * Finalize and construct immutable Stroke object
   */
  build(): Stroke | null {
    if (this.points.length === 0) return null;

    const strokeId = `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const outline = Smoother.computeOutline(this.points, this.tool, this.width);

    return {
      id: strokeId,
      pageId: this.pageId,
      tool: this.tool,
      color: this.color,
      width: this.width,
      points: [...this.points],
      pathOutline: outline,
      boundingBox: this.getBoundingBox(),
      createdAt: this.startTime,
    };
  }
}
