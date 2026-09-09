import React, { useRef, useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { Check } from 'lucide-react';
import { BoardThemeType, Stroke, StrokeTool, ViewportTransform, ShapeType } from '../../types/whiteboard';
import { WHITEBOARD_THEME, BLACKBOARD_THEME } from '../../types/theme';
import { Smoother } from '../../core/inking/Smoother';
import { StrokeBuilder } from '../../core/inking/StrokeBuilder';
import { Viewport } from '../../core/canvas/Viewport';
import { CanvasController } from '../../core/canvas/CanvasController';
import { ShapeGenerator } from '../../core/shapes/ShapeGenerator';

interface WhiteboardCanvasProps {
  pageId: string;
  theme: BoardThemeType;
  currentTool: StrokeTool;
  currentColor: string;
  currentWidth: number;
  strokes: Stroke[];
  onStrokeComplete: (stroke: Stroke) => void;
  onSelectColor?: (color: string) => void;
  transform: ViewportTransform;
  onTransformChange: (transform: ViewportTransform) => void;
  onCanvasSizeChange?: (width: number, height: number) => void;
  activeShapeType?: ShapeType;
  isAutoSnapEnabled?: boolean;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  pageId,
  theme,
  currentTool,
  currentColor,
  currentWidth,
  strokes,
  onStrokeComplete,
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

  const lastReportedSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const onCanvasSizeChangeRef = useRef(onCanvasSizeChange);
  onCanvasSizeChangeRef.current = onCanvasSizeChange;

  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Dynamic Pointer Reticle tracking
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Long-Press Quick Color Picker State
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const [radialMenu, setRadialMenu] = useState<{ x: number; y: number; isOpen: boolean }>({
    x: 0,
    y: 0,
    isOpen: false,
  });

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

    const isPanAction = isSpacePressed || e.button === 1 || currentTool === 'pan';

    if (isPanAction) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        transformX: transform.x,
        transformY: transform.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Drawing (left click / pen / touch / eraser)
    if (e.button !== 0 && e.button !== 5 && e.pointerType === 'mouse') return;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const rect = target.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    setPointerPos({ x: localX, y: localY, visible: true });

    // If current tool is shape, start shape drawing
    if (currentTool === 'shape') {
      isDrawingShapeRef.current = true;
      shapeStartRef.current = Viewport.screenToWorld(localX, localY, transform);
      return;
    }

    // Detect hardware stylus eraser (tip flipped or side eraser button held)
    const isHardwareEraser =
      (e.nativeEvent as any).pointerType === 'pen' &&
      ((e.nativeEvent as any).button === 5 ||
        ((e.nativeEvent as any).buttons & 32) === 32 ||
        (e.nativeEvent as any).eraser === true);

    const activeToolForStroke = isHardwareEraser ? 'stroke-eraser' : currentTool;

    // Setup Long-Press Color Change Trigger (450ms hold) - only for drawing pens
    if (!isHardwareEraser && (activeToolForStroke === 'pen' || activeToolForStroke === 'pencil' || activeToolForStroke === 'highlighter')) {
      longPressStartRef.current = { x: localX, y: localY };
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

      longPressTimerRef.current = setTimeout(() => {
        // Trainer held pen down in place: trigger Quick Color Radial Menu!
        const scratchCanvas = scratchCanvasRef.current;
        if (scratchCanvas) {
          const ctx = scratchCanvas.getContext('2d');
          ctx?.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
        }
        isDrawingRef.current = false;
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

    // Render first point immediately
    drawActiveStroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;

    // Update real-time brush pointer position relative to canvas container
    setPointerPos({ x: localX, y: localY, visible: true });

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

    if (!isDrawingRef.current || !activeBuilderRef.current) return;

    activeBuilderRef.current.addCoalescedEvents(e.nativeEvent, rect, transform);

    // DIRECT, IMMEDIATE DRAWING
    drawActiveStroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
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

    if (!isDrawingRef.current || !activeBuilderRef.current) return;

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
    handlePointerUp(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setPointerPos(p => ({ ...p, visible: false }));
    handlePointerCancel(e);
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
      className={`relative w-full h-full overflow-hidden select-none ${getCursorClass()}`}
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

      {/* Dynamic Pen-Size Brush Pointer Reticle */}
      {pointerPos.visible && !isSpacePressed && currentTool !== 'pan' && (
        <div
          style={{
            transform: `translate3d(${pointerPos.x}px, ${pointerPos.y}px, 0) translate(-50%, -50%)`,
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
