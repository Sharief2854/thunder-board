import { BoundingBox, InkPoint, ShapeType, Stroke } from '../../types/whiteboard';

export class ShapeGenerator {
  /**
   * Helper to interpolate points between two coordinates
   */
  private static interpolateSegment(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    steps: number
  ): InkPoint[] {
    const points: InkPoint[] = [];
    const now = Date.now();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t,
        pressure: 0.5,
        timestamp: now + i,
      });
    }
    return points;
  }

  /**
   * Generate geometric InkPoints for any ShapeType given start and end world coordinates
   */
  static generatePoints(
    type: ShapeType,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): InkPoint[] {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const width = maxX - minX;
    const height = maxY - minY;
    const cx = minX + width / 2;
    const cy = minY + height / 2;

    switch (type) {
      case 'rectangle': {
        const p1 = { x: minX, y: minY };
        const p2 = { x: maxX, y: minY };
        const p3 = { x: maxX, y: maxY };
        const p4 = { x: minX, y: maxY };
        return [
          ...this.interpolateSegment(p1, p2, 8),
          ...this.interpolateSegment(p2, p3, 8),
          ...this.interpolateSegment(p3, p4, 8),
          ...this.interpolateSegment(p4, p1, 8),
        ];
      }

      case 'circle': {
        const rx = Math.max(1, width / 2);
        const ry = Math.max(1, height / 2);
        const steps = 48;
        const points: InkPoint[] = [];
        const now = Date.now();
        for (let i = 0; i <= steps; i++) {
          const theta = (i / steps) * Math.PI * 2;
          points.push({
            x: cx + rx * Math.cos(theta),
            y: cy + ry * Math.sin(theta),
            pressure: 0.5,
            timestamp: now + i,
          });
        }
        return points;
      }

      case 'triangle': {
        const top = { x: cx, y: minY };
        const br = { x: maxX, y: maxY };
        const bl = { x: minX, y: maxY };
        return [
          ...this.interpolateSegment(top, br, 8),
          ...this.interpolateSegment(br, bl, 8),
          ...this.interpolateSegment(bl, top, 8),
        ];
      }

      case 'line': {
        return this.interpolateSegment(start, end, 16);
      }

      case 'arrow': {
        const shaft = this.interpolateSegment(start, end, 16);
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        const headLen = Math.max(14, Math.min(36, dist * 0.25));
        const wingAngle = Math.PI / 6; // 30 degrees

        const wing1 = {
          x: end.x - headLen * Math.cos(angle - wingAngle),
          y: end.y - headLen * Math.sin(angle - wingAngle),
        };
        const wing2 = {
          x: end.x - headLen * Math.cos(angle + wingAngle),
          y: end.y - headLen * Math.sin(angle + wingAngle),
        };

        const w1Points = this.interpolateSegment(end, wing1, 6);
        const w2Points = this.interpolateSegment(end, wing2, 6);
        const endPoint: InkPoint = { x: end.x, y: end.y, pressure: 0.5, timestamp: Date.now() };

        return [...shaft, ...w1Points, endPoint, ...w2Points];
      }

      case 'diamond': {
        const top = { x: cx, y: minY };
        const right = { x: maxX, y: cy };
        const bottom = { x: cx, y: maxY };
        const left = { x: minX, y: cy };
        return [
          ...this.interpolateSegment(top, right, 8),
          ...this.interpolateSegment(right, bottom, 8),
          ...this.interpolateSegment(bottom, left, 8),
          ...this.interpolateSegment(left, top, 8),
        ];
      }

      case 'star': {
        const R = Math.max(width, height) / 2;
        const r = R * 0.45;
        const points: InkPoint[] = [];
        const numPoints = 5;
        const vertices: { x: number; y: number }[] = [];

        for (let i = 0; i < numPoints * 2; i++) {
          const radius = i % 2 === 0 ? R : r;
          const theta = (i / (numPoints * 2)) * Math.PI * 2 - Math.PI / 2;
          vertices.push({
            x: cx + radius * Math.cos(theta),
            y: cy + radius * Math.sin(theta),
          });
        }
        vertices.push(vertices[0]); // Close loop

        for (let i = 0; i < vertices.length - 1; i++) {
          points.push(...this.interpolateSegment(vertices[i], vertices[i + 1], 6));
        }
        return points;
      }

      default:
        return this.interpolateSegment(start, end, 10);
    }
  }

  /**
   * Compute bounding box for a set of points
   */
  static computeBoundingBox(points: InkPoint[]): BoundingBox {
    if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Render a mathematically perfect geometric shape with crisp, pristine edges and smooth joins
   */
  static renderShape(
    ctx: CanvasRenderingContext2D,
    type: ShapeType,
    start: { x: number; y: number },
    end: { x: number; y: number },
    color: string,
    width: number
  ): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    const w = maxX - minX;
    const h = maxY - minY;
    const cx = minX + w / 2;
    const cy = minY + h / 2;

    switch (type) {
      case 'rectangle': {
        const radius = Math.min(8, w / 4, h / 4);
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function' && radius > 0) {
          (ctx as any).roundRect(minX, minY, w, h, radius);
        } else {
          ctx.strokeRect(minX, minY, w, h);
          ctx.restore();
          return;
        }
        ctx.stroke();
        break;
      }

      case 'circle': {
        const rx = Math.max(0.5, w / 2);
        const ry = Math.max(0.5, h / 2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo(cx, minY);
        ctx.lineTo(maxX, maxY);
        ctx.lineTo(minX, maxY);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case 'line': {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
      }

      case 'arrow': {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const dist = Math.hypot(end.x - start.x, end.y - start.y);
        const headLen = Math.max(12, Math.min(32, dist * 0.25, width * 5));
        const wingAngle = Math.PI / 6; // 30 degrees

        const wing1 = {
          x: end.x - headLen * Math.cos(angle - wingAngle),
          y: end.y - headLen * Math.sin(angle - wingAngle),
        };
        const wing2 = {
          x: end.x - headLen * Math.cos(angle + wingAngle),
          y: end.y - headLen * Math.sin(angle + wingAngle),
        };

        // Main shaft
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(wing1.x, wing1.y);
        ctx.lineTo(end.x, end.y);
        ctx.lineTo(wing2.x, wing2.y);
        ctx.stroke();
        break;
      }

      case 'diamond': {
        ctx.beginPath();
        ctx.moveTo(cx, minY);
        ctx.lineTo(maxX, cy);
        ctx.lineTo(cx, maxY);
        ctx.lineTo(minX, cy);
        ctx.closePath();
        ctx.stroke();
        break;
      }

      case 'star': {
        const R = Math.max(w, h) / 2;
        const r = R * 0.42;
        const numPoints = 5;

        ctx.beginPath();
        for (let i = 0; i < numPoints * 2; i++) {
          const radius = i % 2 === 0 ? R : r;
          const theta = (i / (numPoints * 2)) * Math.PI * 2 - Math.PI / 2;
          const px = cx + radius * Math.cos(theta);
          const py = cy + radius * Math.sin(theta);
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.stroke();
        break;
      }

      default:
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Build a complete Stroke object for a shape
   */
  static generateStroke(
    pageId: string,
    type: ShapeType,
    start: { x: number; y: number },
    end: { x: number; y: number },
    color: string,
    width: number
  ): Stroke {
    const points = this.generatePoints(type, start, end);
    const boundingBox = this.computeBoundingBox(points);

    return {
      id: `stroke_shape_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageId,
      tool: 'shape',
      color,
      width,
      points,
      shapeData: {
        type,
        start,
        end,
      },
      boundingBox,
      createdAt: Date.now(),
    };
  }

  /**
   * Recognize if a rough hand-drawn stroke matches a geometric shape
   * Snaps rough circles, rectangles, triangles, or straight lines into perfect shapes!
   */
  static recognizeRoughShape(
    points: InkPoint[]
  ): { type: ShapeType; start: { x: number; y: number }; end: { x: number; y: number } } | null {
    if (points.length < 8) return null;

    const start = points[0];
    const end = points[points.length - 1];
    const bbox = this.computeBoundingBox(points);

    // Filter out very tiny gestures
    if (bbox.width < 25 && bbox.height < 25) return null;

    // Calculate total path length
    let pathLength = 0;
    for (let i = 1; i < points.length; i++) {
      pathLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    if (pathLength < 30) return null;

    const directDistance = Math.hypot(end.x - start.x, end.y - start.y);

    // 1. Straight Line Check: direct start-to-end distance is almost the entire path length
    if (directDistance / pathLength > 0.92) {
      return {
        type: 'line',
        start: { x: start.x, y: start.y },
        end: { x: end.x, y: end.y },
      };
    }

    // 2. Closed Loop Check (Distance between start and end is small compared to perimeter)
    const isClosed = directDistance < Math.max(35, pathLength * 0.22);
    if (!isClosed) return null;

    // Calculate area via Shoelace formula
    let shoelace = 0;
    for (let i = 0; i < points.length - 1; i++) {
      shoelace += points[i].x * points[i + 1].y - points[i + 1].x * points[i].y;
    }
    const area = Math.abs(shoelace / 2);
    const bboxArea = bbox.width * bbox.height;

    // Circularity: 4 * PI * Area / (Perimeter^2). For a perfect circle, this is 1.0.
    const circularity = (4 * Math.PI * area) / (pathLength * pathLength);

    // Circle / Ellipse: circularity is between 0.65 and 1.3
    if (circularity > 0.65 && circularity < 1.35) {
      return {
        type: 'circle',
        start: { x: bbox.minX, y: bbox.minY },
        end: { x: bbox.maxX, y: bbox.maxY },
      };
    }

    // Rectangle / Square: area fills ~68% to 95% of bounding box
    const fillRatio = area / Math.max(1, bboxArea);
    if (fillRatio > 0.68 && fillRatio < 0.98) {
      return {
        type: 'rectangle',
        start: { x: bbox.minX, y: bbox.minY },
        end: { x: bbox.maxX, y: bbox.maxY },
      };
    }

    // Triangle: area fills ~40% to 62% of bounding box
    if (fillRatio > 0.35 && fillRatio <= 0.65) {
      return {
        type: 'triangle',
        start: { x: bbox.minX, y: bbox.minY },
        end: { x: bbox.maxX, y: bbox.maxY },
      };
    }

    return null;
  }
}
