import getStroke, { StrokeOptions } from 'perfect-freehand';
import { InkPoint, StrokeTool } from '../../types/whiteboard';

export interface SmootherOptions {
  size: number;
  thinning?: number;
  smoothing?: number;
  streamline?: number;
  easing?: (t: number) => number;
  start?: {
    taper?: number | boolean;
    easing?: (t: number) => number;
    cap?: boolean;
  };
  end?: {
    taper?: number | boolean;
    easing?: (t: number) => number;
    cap?: boolean;
  };
  simulatePressure?: boolean;
}

export class Smoother {
  /**
   * Get tool-specific perfect-freehand stroke options
   */
  static getOptionsForTool(tool: StrokeTool, width: number): StrokeOptions {
    switch (tool) {
      case 'pen':
        return {
          size: width,
          thinning: 0.45,       // Natural pressure response
          smoothing: 0.6,       // Smooth hand jitter
          streamline: 0.45,     // Reduces lagging while smoothing
          simulatePressure: true,
          start: {
            taper: true,
            cap: true,
          },
          end: {
            taper: true,
            cap: true,
          },
        };

      case 'pencil':
        return {
          size: Math.max(1, width * 0.8),
          thinning: 0.15,       // Almost uniform, pencil-like
          smoothing: 0.4,
          streamline: 0.3,
          simulatePressure: true,
          start: { taper: 2, cap: false },
          end: { taper: 2, cap: false },
        };

      case 'highlighter':
        return {
          size: width * 3.5,    // Wide broad stroke
          thinning: 0,          // Uniform width for highlighter
          smoothing: 0.7,
          streamline: 0.5,
          simulatePressure: false,
          start: { taper: false, cap: false },
          end: { taper: false, cap: false },
        };

      case 'shape':
        return {
          size: width,
          thinning: 0,
          smoothing: 0.1,
          streamline: 0,
          simulatePressure: false,
          start: { taper: false, cap: true },
          end: { taper: false, cap: true },
        };

      case 'stroke-eraser':
      default:
        return {
          size: width * 2,
          thinning: 0,
          smoothing: 0.5,
          streamline: 0.4,
          simulatePressure: false,
        };
    }
  }

  /**
   * Convert InkPoint array to smoothed 2D polygon outline
   */
  static computeOutline(points: InkPoint[], tool: StrokeTool, width: number): number[][] {
    if (points.length === 0) return [];

    // Format points as [x, y, pressure]
    const rawPoints = points.map(p => [p.x, p.y, p.pressure]);
    const options = this.getOptionsForTool(tool, width);

    return getStroke(rawPoints, options);
  }

  /**
   * Render a polygon outline directly to Canvas 2D rendering context
   */
  static drawPolygon(ctx: CanvasRenderingContext2D, outline: number[][]): void {
    if (outline.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(outline[0][0], outline[0][1]);

    for (let i = 1; i < outline.length; i++) {
      ctx.lineTo(outline[i][0], outline[i][1]);
    }

    ctx.closePath();
    ctx.fill();
  }

  /**
   * Directly render InkPoints with smoothing and tool color
   */
  static renderStroke(
    ctx: CanvasRenderingContext2D,
    points: InkPoint[],
    tool: StrokeTool,
    color: string,
    width: number
  ): void {
    if (points.length === 0) return;

    // Single point / dot fallback
    if (points.length === 1) {
      const p = points[0];
      const r = (width * (p.pressure || 0.5)) / 2;
      ctx.save();
      ctx.fillStyle = color;
      if (tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, r), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const outline = this.computeOutline(points, tool, width);
    if (outline.length === 0) return;

    ctx.save();
    ctx.fillStyle = color;

    if (tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.globalCompositeOperation = 'multiply';
    }

    this.drawPolygon(ctx, outline);
    ctx.restore();
  }
}
