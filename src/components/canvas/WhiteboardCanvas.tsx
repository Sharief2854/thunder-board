import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { Check } from 'lucide-react';
import { BoardThemeType, Stroke, StrokeTool, ViewportTransform, ShapeType } from '../../types/whiteboard';
import { WHITEBOARD_THEME, BLACKBOARD_THEME } from '../../types/theme';
import { Smoother } from '../../core/inking/Smoother';
import { StrokeBuilder } from '../../core/inking/StrokeBuilder';
import { Viewport } from '../../core/canvas/Viewport';
import { CanvasController } from '../../core/canvas/CanvasController';
import { ShapeGenerator } from '../../core/shapes/ShapeGenerator';
import { StorageManager } from '../../core/storage/StorageManager';

interface WhiteboardCanvasProps {
  pageId: string;
  theme: BoardThemeType;
  currentTool: StrokeTool;
  currentColor: string;
  currentWidth: number;
  strokes: Stroke[];
  onStrokeComplete: (stroke: Stroke) => void;
  onEraseStrokes?: (strokeIds: string[]) => void;
  onEraseEnd?: () => void;
  onSelectColor?: (color: string) => void;
  transform: ViewportTransform;
  onTransformChange: (transform: ViewportTransform) => void;
  onCanvasSizeChange?: (width: number, height: number) => void;
  activeShapeType?: ShapeType;
  isAutoSnapEnabled?: boolean;
}

// Squared distance from point (px, py) to line segment (ax, ay) -> (bx, by)
function distToSegmentSquared(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) {
    const dpx = px - ax;
    const dpy = py - ay;
    return dpx * dpx + dpy * dpy;
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const ex = px - projX;
  const ey = py - projY;
  return ex * ex + ey * ey;
}

const WhiteboardCanvasComponent: React.FC<WhiteboardCanvasProps> = ({
  pageId,
  theme,
  currentTool,
  currentColor,
  currentWidth,
  strokes,
  onStrokeComplete,
  onEraseStrokes,
  onEraseEnd,
  onSelectColor,
  transform,
  onTransformChange,
  onCanvasSizeChange,
  activeShapeType = 'rectangle',
  isAutoSnapEnabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);

  const activeBuilderRef = useRef<StrokeBuilder | null>(null);
  const isDrawingRef = useRef<boolean>(false);
  const isDrawingShapeRef = useRef<boolean>(false);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number; transformX: number; transformY: number }>({
    x: 0,
    y: 0,
    transformX: 0,
    transformY: 0,
  });

  // Multi-Touch Screen Tracking (Two-finger pan and pinch-to-zoom)
  const activePointersRef = useRef<Map<number, { x: number; y: number; pointerType: string }>>(new Map());
  const isTwoFingerGestureRef = useRef<boolean>(false);
  const twoFingerStartRef = useRef<{
    midX: number;
    midY: number;
    dist: number;
    anchorWorld: { x: number; y: number };
    startTransform: ViewportTransform;
  }>({
    midX: 0,
    midY: 0,
    dist: 1,
    anchorWorld: { x: 0, y: 0 },
    startTransform: { x: 0, y: 0, zoom: 1 },
  });
  const touchCooldownUntilRef = useRef<number>(0);

  const lastReportedSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const onCanvasSizeChangeRef = useRef(onCanvasSizeChange);
  onCanvasSizeChangeRef.current = onCanvasSizeChange;

  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Dynamic Pointer Reticle DOM ref (Zero-re-render high-frequency tracking)
  const reticleRef = useRef<HTMLDivElement>(null);
  const rafActiveStrokeRef = useRef<number | null>(null);

  // Long-Press Quick Color Picker State
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const [radialMenu, setRadialMenu] = useState<{ x: number; y: number; isOpen: boolean }>({
    x: 0,
    y: 0,
    isOpen: false,
  });

  // Real-Time Eraser Tracking State
  const isErasingRef = useRef<boolean>(false);
  const erasedInGestureRef = useRef<Set<string>>(new Set());

  // Erase strokes intersecting the circular eraser area in real-time with sub-millisecond precision
  const eraseStrokesAtPoint = useCallback((worldX: number, worldY: number, radius: number) => {
    if (!onEraseStrokes) return;

    const hitIds: string[] = [];

    for (const stroke of strokes) {
      if (stroke.isErased || erasedInGestureRef.current.has(stroke.id)) continue;

      // Fast bounding-box rejection
      const box = stroke.boundingBox;
      if (box) {
        if (
          worldX < box.minX - radius ||
          worldX > box.maxX + radius ||
          worldY < box.minY - radius ||
          worldY > box.maxY + radius
        ) {
          continue;
        }
      }

      // Precise segment-level distance check
      const effectiveRadiusSq = (radius + stroke.width / 2) ** 2;
      let hit = false;
      const pts = stroke.points;

      if (pts.length <= 1) {
        if (pts.length === 1) {
          const d2 = (worldX - pts[0].x) ** 2 + (worldY - pts[0].y) ** 2;
          hit = d2 <= effectiveRadiusSq;
        }
      } else {
        for (let i = 0; i < pts.length - 1; i++) {
          const d2 = distToSegmentSquared(worldX, worldY, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
          if (d2 <= effectiveRadiusSq) {
            hit = true;
            break;
          }
        }
      }

      if (!hit && stroke.shapeData) {
        const { start, end } = stroke.shapeData;
        const d2 = distToSegmentSquared(worldX, worldY, start.x, start.y, end.x, end.y);
        hit = d2 <= effectiveRadiusSq;
      }

      if (hit) {
        hitIds.push(stroke.id);
        erasedInGestureRef.current.add(stroke.id);
      }
    }

    if (hitIds.length > 0) {
      onEraseStrokes(hitIds);
    }
  }, [onEraseStrokes, strokes]);

  const themeConfig = theme === 'whiteboard' ? WHITEBOARD_THEME : BLACKBOARD_THEME;

  // Spacebar pan key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && (e.target as HTMLElement).tagName !== 'INPUT') {
        setIsSpacePressed(true);
      }
      if (e.key === 'Escape' && radialMenu.isOpen) {
        setRadialMenu({ x: 0, y: 0, isOpen: false });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [radialMenu.isOpen]);

  // Render Background Grid
  const renderBackground = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const container = containerRef.current;
    if (!bgCanvas || !container) return;

    const ctx = bgCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Fill theme background
    ctx.fillStyle = themeConfig.backgroundColor;
    ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Apply DPR scale for crisp grid
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!themeConfig.gridColor || themeConfig.gridColor === 'transparent') return;

    const gridSize = 28 * transform.zoom;
    if (gridSize < 8) return;

    const offsetX = ((transform.x % gridSize) + gridSize) % gridSize;
    const offsetY = ((transform.y % gridSize) + gridSize) % gridSize;

    ctx.fillStyle = themeConfig.gridColor;
    const dotRadius = Math.max(1, 1.2 * Math.min(1.5, transform.zoom));

    for (let x = offsetX; x < width; x += gridSize) {
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [themeConfig, transform]);

  // Render Committed Ink Strokes with Viewport Culling
  const renderCommittedInk = useCallback(() => {
    const inkCanvas = inkCanvasRef.current;
    const container = containerRef.current;
    if (!inkCanvas || !container) return;

    const ctx = inkCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Reset transform & clear entire canvas buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, inkCanvas.width, inkCanvas.height);

    // Apply combined DPR + Viewport World Matrix
    ctx.setTransform(
      dpr * transform.zoom,
      0,
      0,
      dpr * transform.zoom,
      dpr * transform.x,
      dpr * transform.y
    );

    for (const stroke of strokes) {
      if (stroke.isErased) continue;

      // Viewport culling
      if (stroke.boundingBox && !Viewport.isBoxInViewport(stroke.boundingBox, width, height, transform)) {
        continue;
      }

      if (stroke.shapeData) {
        ShapeGenerator.renderShape(
          ctx,
          stroke.shapeData.type,
          stroke.shapeData.start,
          stroke.shapeData.end,
          stroke.color,
          stroke.width
        );
      } else if (stroke.pathOutline && stroke.pathOutline.length > 0) {
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
  }, [strokes, transform]);

  // Live Scratch Drawing Render Loop (Direct Sub-millisecond Execution)
  const drawActiveStroke = useCallback(() => {
    const scratchCanvas = scratchCanvasRef.current;
    if (!scratchCanvas || !activeBuilderRef.current) return;

    const ctx = scratchCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Reset transform & clear full scratch buffer
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);

    // Apply combined DPR + Viewport World Matrix
    ctx.setTransform(
      dpr * transform.zoom,
      0,
      0,
      dpr * transform.zoom,
      dpr * transform.x,
      dpr * transform.y
    );

    const points = activeBuilderRef.current.getPoints();
    const activeTool = activeBuilderRef.current.getTool();
    Smoother.renderStroke(ctx, points, activeTool, currentColor, currentWidth);
  }, [currentColor, currentWidth, transform]);

  // RequestAnimationFrame scheduler for ultra-smooth 120fps live drawing
  const scheduleDrawActiveStroke = useCallback(() => {
    if (rafActiveStrokeRef.current !== null) return;
    rafActiveStrokeRef.current = requestAnimationFrame(() => {
      rafActiveStrokeRef.current = null;
      drawActiveStroke();
    });
  }, [drawActiveStroke]);

  // Resize All Canvases to High-DPI DPR
  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    if (
      lastReportedSizeRef.current.width !== width ||
      lastReportedSizeRef.current.height !== height
    ) {
      lastReportedSizeRef.current = { width, height };
      onCanvasSizeChangeRef.current?.(width, height);
    }

    const canvases = [bgCanvasRef.current, inkCanvasRef.current, scratchCanvasRef.current];

    canvases.forEach(canvas => {
      if (!canvas) return;
      const targetWidth = Math.round(width * dpr);
      const targetHeight = Math.round(height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    });

    renderBackground();
    renderCommittedInk();
    if (isDrawingRef.current) {
      drawActiveStroke();
    }
  }, [renderBackground, renderCommittedInk, drawActiveStroke]);

  // Immediate synchronous sizing on mount
  useLayoutEffect(() => {
    resizeCanvases();
  }, [resizeCanvases]);

  // Container Resize Observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      resizeCanvases();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [resizeCanvases]);

  // Re-render committed layers when strokes, theme or viewport changes
  useEffect(() => {
    renderBackground();
    renderCommittedInk();
  }, [strokes, theme, transform, renderBackground, renderCommittedInk]);

  // Wheel Zoom (Anchored to Cursor) & Trackpad Pan
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const next = CanvasController.zoomAtPoint(
        transform,
        e.clientX,
        e.clientY,
        rect,
        zoomFactor
      );
      onTransformChange(next);
    } else {
      onTransformChange({
        x: transform.x - e.deltaX,
        y: transform.y - e.deltaY,
        zoom: transform.zoom,
      });
    }
  };

  // Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // If radial color menu is open, close it on tap
    if (radialMenu.isOpen) {
      setRadialMenu({ x: 0, y: 0, isOpen: false });
      return;
    }

    // Record this pointer in active pointer tracker
    activePointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      pointerType: e.pointerType,
    });

    // Palm rejection: If an active stylus pen is drawing, ignore simultaneous palm touches
    const hasActiveStylus = Array.from(activePointersRef.current.values()).some(
      p => p.pointerType === 'pen'
    );
    if (hasActiveStylus && e.pointerType === 'touch') {
      return;
    }

    // Post-gesture cooldown: prevent accidental touch marks right after lifting two fingers
    if (e.pointerType === 'touch' && Date.now() < touchCooldownUntilRef.current) {
      return;
    }

    // MULTI-TOUCH GESTURE DETECTION: 2 or more touch pointers active
    const touchPointers = Array.from(activePointersRef.current.values()).filter(
      p => p.pointerType === 'touch'
    );

    if (touchPointers.length >= 2) {
      // Immediately abort any in-flight drawing started by the first finger
      if (isDrawingRef.current || activeBuilderRef.current) {
        const scratchCanvas = scratchCanvasRef.current;
        if (scratchCanvas) {
          const ctx = scratchCanvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
          }
        }
        isDrawingRef.current = false;
        activeBuilderRef.current = null;
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (isDrawingShapeRef.current) {
        isDrawingShapeRef.current = false;
        shapeStartRef.current = null;
      }
      if (reticleRef.current) {
        reticleRef.current.style.display = 'none';
      }

      // Initialize two-finger gesture state
      const p1 = touchPointers[0];
      const p2 = touchPointers[1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      const container = containerRef.current;
      const rect = container ? container.getBoundingClientRect() : { left: 0, top: 0 };
      const screenX = midX - rect.left;
      const screenY = midY - rect.top;
      const anchorWorld = Viewport.screenToWorld(screenX, screenY, transform);

      isTwoFingerGestureRef.current = true;
      twoFingerStartRef.current = {
        midX,
        midY,
        dist: Math.max(dist, 10),
        anchorWorld,
        startTransform: { ...transform },
      };

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    const isPanAction = isSpacePressed || e.button === 1 || currentTool === 'pan';

    if (isPanAction) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        transformX: transform.x,
        transformY: transform.y,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    // Drawing (left click / pen / touch / eraser)
    if (e.button !== 0 && e.button !== 5 && e.pointerType === 'mouse') return;

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {}

    const rect = target.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    if (reticleRef.current) {
      if (e.pointerType === 'touch') {
        reticleRef.current.style.display = 'none';
      } else {
        reticleRef.current.style.display = 'flex';
        reticleRef.current.style.transform = `translate3d(${localX}px, ${localY}px, 0) translate(-50%, -50%)`;
      }
    }

    // If current tool is shape, start shape drawing
    if (currentTool === 'shape') {
      isDrawingShapeRef.current = true;
      shapeStartRef.current = Viewport.screenToWorld(localX, localY, transform);
      StorageManager.setDrawingActive(true);
      return;
    }

    // Detect hardware stylus eraser (tip flipped or side eraser button held)
    const isHardwareEraser =
      (e.nativeEvent as any).pointerType === 'pen' &&
      ((e.nativeEvent as any).button === 5 ||
        ((e.nativeEvent as any).buttons & 32) === 32 ||
        (e.nativeEvent as any).eraser === true);

    const activeToolForStroke = isHardwareEraser ? 'stroke-eraser' : currentTool;

    // Real-Time Smooth Eraser: Erase strokes continuously under the reticle without drawing lines
    if (activeToolForStroke === 'stroke-eraser') {
      isErasingRef.current = true;
      StorageManager.setDrawingActive(true);
      erasedInGestureRef.current.clear();
      const world = Viewport.screenToWorld(localX, localY, transform);
      const eraserRadius = Math.max(14, (currentWidth * 2.5) / transform.zoom);
      eraseStrokesAtPoint(world.x, world.y, eraserRadius);
      return;
    }

    // Setup Long-Press Color Change Trigger (450ms hold) - only for drawing pens
    if (!isHardwareEraser && (activeToolForStroke === 'pen' || activeToolForStroke === 'pencil' || activeToolForStroke === 'highlighter')) {
      longPressStartRef.current = { x: localX, y: localY };
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

      longPressTimerRef.current = setTimeout(() => {
        const scratchCanvas = scratchCanvasRef.current;
        if (scratchCanvas) {
          const ctx = scratchCanvas.getContext('2d');
          ctx?.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
        }
        isDrawingRef.current = false;
        StorageManager.setDrawingActive(false);
        activeBuilderRef.current = null;
        try {
          if (target.hasPointerCapture(e.pointerId)) {
            target.releasePointerCapture(e.pointerId);
          }
        } catch {}

        setRadialMenu({ x: localX, y: localY, isOpen: true });
        longPressTimerRef.current = null;
      }, 450);
    }

    const builder = new StrokeBuilder(pageId, activeToolForStroke, currentColor, currentWidth);
    builder.addCoalescedEvents(e.nativeEvent, rect, transform);

    activeBuilderRef.current = builder;
    isDrawingRef.current = true;
    StorageManager.setDrawingActive(true);

    // Render first point immediately
    drawActiveStroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Keep pointer coordinates updated in active map
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        pointerType: e.pointerType,
      });
    }

    // TWO-FINGER TOUCHSCREEN PAN & PINCH-ZOOM GESTURE
    if (isTwoFingerGestureRef.current) {
      const touchPointers = Array.from(activePointersRef.current.values()).filter(
        p => p.pointerType === 'touch'
      );
      if (touchPointers.length >= 2) {
        const p1 = touchPointers[0];
        const p2 = touchPointers[1];
        const curMidX = (p1.x + p2.x) / 2;
        const curMidY = (p1.y + p2.y) / 2;
        const curDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();

        const { dist: startDist, anchorWorld, startTransform } = twoFingerStartRef.current;

        // Smooth pinch zoom scale calculation
        const scale = curDist / startDist;
        const newZoom = Math.min(
          CanvasController.MAX_ZOOM,
          Math.max(CanvasController.MIN_ZOOM, startTransform.zoom * scale)
        );

        // Pan translation anchored at the world point under midpoint
        const curScreenX = curMidX - rect.left;
        const curScreenY = curMidY - rect.top;

        const newX = curScreenX - anchorWorld.x * newZoom;
        const newY = curScreenY - anchorWorld.y * newZoom;

        onTransformChange({
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          zoom: Math.round(newZoom * 1000) / 1000,
        });
      }
      return;
    }

    // Ignore single-finger touch moves during cooldown
    if (e.pointerType === 'touch' && Date.now() < touchCooldownUntilRef.current) {
      return;
    }

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    // Update real-time brush pointer position directly on DOM (0 React re-renders)
    if (reticleRef.current) {
      if (e.pointerType === 'touch') {
        reticleRef.current.style.display = 'none';
      } else {
        reticleRef.current.style.display = 'flex';
        reticleRef.current.style.transform = `translate3d(${localX}px, ${localY}px, 0) translate(-50%, -50%)`;
      }
    }

    // Live preview when drawing shapes
    if (isDrawingShapeRef.current && shapeStartRef.current) {
      const currentWorld = Viewport.screenToWorld(localX, localY, transform);
      const scratchCanvas = scratchCanvasRef.current;
      if (scratchCanvas) {
        const ctx = scratchCanvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
          ctx.setTransform(
            dpr * transform.zoom,
            0,
            0,
            dpr * transform.zoom,
            dpr * transform.x,
            dpr * transform.y
          );
          ShapeGenerator.renderShape(
            ctx,
            activeShapeType,
            shapeStartRef.current,
            currentWorld,
            currentColor,
            currentWidth
          );
        }
      }
      return;
    }

    // If long press timer is active, check if pointer moved away (drawing normal stroke)
    if (longPressStartRef.current && longPressTimerRef.current) {
      const dist = Math.hypot(
        localX - longPressStartRef.current.x,
        localY - longPressStartRef.current.y
      );
      if (dist > 7) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    if (isPanningRef.current) {
      const deltaX = e.clientX - panStartRef.current.x;
      const deltaY = e.clientY - panStartRef.current.y;
      onTransformChange({
        x: panStartRef.current.transformX + deltaX,
        y: panStartRef.current.transformY + deltaY,
        zoom: transform.zoom,
      });
      return;
    }

    // Handle Real-Time Eraser Swiping
    if (isErasingRef.current) {
      const eraserRadius = Math.max(14, (currentWidth * 2.5) / transform.zoom);
      const native = e.nativeEvent as any;
      if (typeof native.getCoalescedEvents === 'function') {
        const coalesced = native.getCoalescedEvents();
        if (coalesced && coalesced.length > 0) {
          for (const ce of coalesced) {
            const cWorld = Viewport.screenToWorld(ce.clientX - rect.left, ce.clientY - rect.top, transform);
            eraseStrokesAtPoint(cWorld.x, cWorld.y, eraserRadius);
          }
          return;
        }
      }
      const world = Viewport.screenToWorld(localX, localY, transform);
      eraseStrokesAtPoint(world.x, world.y, eraserRadius);
      StorageManager.recordDrawingActivity();
      return;
    }

    if (!isDrawingRef.current || !activeBuilderRef.current) return;

    StorageManager.recordDrawingActivity();
    activeBuilderRef.current.addCoalescedEvents(e.nativeEvent, rect, transform);

    // Ultra-responsive 120fps display-synchronized live drawing (eliminates event queue lag)
    scheduleDrawActiveStroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Remove pointer from tracking map
    activePointersRef.current.delete(e.pointerId);

    // If we were in a two-finger gesture, exit gesture cleanly without committing any stroke
    if (isTwoFingerGestureRef.current) {
      const remainingTouches = Array.from(activePointersRef.current.values()).filter(
        p => p.pointerType === 'touch'
      );
      if (remainingTouches.length < 2) {
        isTwoFingerGestureRef.current = false;
        // Cooldown prevents the remaining finger from accidentally drawing a dot
        touchCooldownUntilRef.current = Date.now() + 300;
      }
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      return;
    }

    // Cancel any pending long press
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;

    // Handle completed shape creation
    if (isDrawingShapeRef.current && shapeStartRef.current) {
      isDrawingShapeRef.current = false;
      const target = e.currentTarget;
      try {
        if (target.hasPointerCapture(e.pointerId)) {
          target.releasePointerCapture(e.pointerId);
        }
      } catch {}

      const rect = target.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const currentWorld = Viewport.screenToWorld(localX, localY, transform);

      const scratchCanvas = scratchCanvasRef.current;
      if (scratchCanvas) {
        const ctx = scratchCanvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
        }
      }

      const dist = Math.hypot(currentWorld.x - shapeStartRef.current.x, currentWorld.y - shapeStartRef.current.y);
      if (dist >= 6) {
        const shapeStroke = ShapeGenerator.generateStroke(
          pageId,
          activeShapeType,
          shapeStartRef.current,
          currentWorld,
          currentColor,
          currentWidth
        );
        onStrokeComplete(shapeStroke);
      }
      shapeStartRef.current = null;
      StorageManager.setDrawingActive(false);
      StorageManager.recordDrawingActivity();
      return;
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignored
      }
      return;
    }

    // Complete Real-Time Eraser Gesture
    if (isErasingRef.current) {
      isErasingRef.current = false;
      erasedInGestureRef.current.clear();
      onEraseEnd?.();
      StorageManager.setDrawingActive(false);
      StorageManager.recordDrawingActivity();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      return;
    }

    if (!isDrawingRef.current || !activeBuilderRef.current) return;

    // Cancel pending animation frame
    if (rafActiveStrokeRef.current !== null) {
      cancelAnimationFrame(rafActiveStrokeRef.current);
      rafActiveStrokeRef.current = null;
    }

    const target = e.currentTarget;
    try {
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }

    const rect = target.getBoundingClientRect();
    activeBuilderRef.current.addCoalescedEvents(e.nativeEvent, rect, transform);

    const finalizedStroke = activeBuilderRef.current.build();

    // Clear scratch buffer immediately
    const scratchCanvas = scratchCanvasRef.current;
    if (scratchCanvas) {
      const ctx = scratchCanvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
      }
    }

    activeBuilderRef.current = null;
    isDrawingRef.current = false;
    StorageManager.setDrawingActive(false);
    StorageManager.recordDrawingActivity();

    if (finalizedStroke) {
      // Auto-Snap rough handwriting into perfect geometric shapes when enabled
      if (isAutoSnapEnabled && (finalizedStroke.tool === 'pen' || finalizedStroke.tool === 'pencil')) {
        const recognized = ShapeGenerator.recognizeRoughShape(finalizedStroke.points);
        if (recognized) {
          const snappedStroke = ShapeGenerator.generateStroke(
            pageId,
            recognized.type,
            recognized.start,
            recognized.end,
            finalizedStroke.color,
            finalizedStroke.width
          );
          onStrokeComplete(snappedStroke);
          return;
        }
      }

      onStrokeComplete(finalizedStroke);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (isTwoFingerGestureRef.current) {
      const remainingTouches = Array.from(activePointersRef.current.values()).filter(
        p => p.pointerType === 'touch'
      );
      if (remainingTouches.length < 2) {
        isTwoFingerGestureRef.current = false;
        touchCooldownUntilRef.current = Date.now() + 300;
      }
    }
    StorageManager.setDrawingActive(false);
    StorageManager.recordDrawingActivity();
    handlePointerUp(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (reticleRef.current) {
      reticleRef.current.style.display = 'none';
    }
    if (e.pointerType !== 'mouse') {
      handlePointerCancel(e);
    }
  };

  const handleSelectColorFromRadial = (newColor: string) => {
    onSelectColor?.(newColor);
    setRadialMenu({ x: 0, y: 0, isOpen: false });
  };

  const getCursorClass = () => {
    if (isSpacePressed || currentTool === 'pan') {
      return isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab';
    }
    if (currentTool === 'shape') {
      return 'cursor-crosshair';
    }
    // For pen, pencil, highlighter, eraser, hide OS cursor and show exact circular reticle
    return 'cursor-none';
  };

  // Calculate actual pixel radius of pointer on screen
  const reticleDiameter = Math.max(
    currentTool === 'stroke-eraser' ? 16 : 4,
    currentWidth * transform.zoom
  );

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none touch-none ${getCursorClass()}`}
    >
      {/* Layer 1: Background & Grid */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 pointer-events-none z-0"
      />

      {/* Layer 2: Committed Ink Strokes */}
      <canvas
        ref={inkCanvasRef}
        className="absolute inset-0 pointer-events-none z-10"
      />

      {/* Layer 3: Active Scratch Canvas (Direct High-FPS In-Flight Drawing) */}
      <canvas
        ref={scratchCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        className="absolute inset-0 z-20 touch-none"
      />

      {/* Dynamic Pen-Size Brush Pointer Reticle (0 React re-renders, 120fps hardware accelerated) */}
      {!isSpacePressed && currentTool !== 'pan' && (
        <div
          ref={reticleRef}
          style={{
            display: 'none',
            transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
            width: `${reticleDiameter}px`,
            height: `${reticleDiameter}px`,
            borderColor: currentTool === 'stroke-eraser' ? '#ef4444' : currentColor,
            backgroundColor:
              currentTool === 'stroke-eraser'
                ? 'rgba(239, 68, 68, 0.16)'
                : currentTool === 'highlighter'
                ? currentColor + '40'
                : currentColor + '20',
          }}
          className="absolute top-0 left-0 pointer-events-none z-30 rounded-full border shadow-sm will-change-transform flex items-center justify-center transition-none"
        >
          {/* Center pinpoint for ultra precision */}
          <div
            style={{
              backgroundColor: currentTool === 'stroke-eraser' ? '#ef4444' : currentColor,
              width: Math.min(3, Math.max(1.5, reticleDiameter * 0.25)),
              height: Math.min(3, Math.max(1.5, reticleDiameter * 0.25)),
            }}
            className="rounded-full shadow-xs"
          />
        </div>
      )}

      {/* Long-Press Radial Color Palette HUD */}
      {radialMenu.isOpen && (
        <div
          style={{
            left: `${radialMenu.x}px`,
            top: `${radialMenu.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className={`absolute z-50 p-2.5 rounded-full shadow-2xl backdrop-blur-2xl border select-none animate-in zoom-in-75 duration-150 ${
            theme === 'whiteboard'
              ? 'bg-white/95 border-slate-300 shadow-[0_16px_48px_rgba(0,0,0,0.25)]'
              : 'bg-slate-900/95 border-white/25 shadow-[0_16px_48px_rgba(0,0,0,0.8)]'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Center: Current active color button */}
            <button
              onClick={() => setRadialMenu({ x: 0, y: 0, isOpen: false })}
              title="Close Color Wheel"
              style={{ backgroundColor: currentColor }}
              className="w-10 h-10 rounded-full shadow-lg border-2 border-white/60 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Check className="w-5 h-5 text-white drop-shadow-md" />
            </button>

            {/* Orbiting Radial Color Swatches */}
            {themeConfig.penColors.map((c, i) => {
              const angle = (i * 2 * Math.PI) / themeConfig.penColors.length - Math.PI / 2;
              const radius = 50; // px distance from center
              const x = Math.round(radius * Math.cos(angle));
              const y = Math.round(radius * Math.sin(angle));

              return (
                <button
                  key={c.value}
                  onClick={() => handleSelectColorFromRadial(c.value)}
                  style={{
                    backgroundColor: c.value,
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  title={c.name}
                  className={`absolute w-8 h-8 rounded-full border-2 shadow-lg transition-transform hover:scale-125 active:scale-95 ${
                    currentColor === c.value
                      ? 'border-blue-500 ring-2 ring-blue-400 scale-110'
                      : 'border-white/50 hover:border-white'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const WhiteboardCanvas = React.memo(WhiteboardCanvasComponent);
