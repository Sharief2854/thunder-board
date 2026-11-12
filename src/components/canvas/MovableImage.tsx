import React, { useRef, useEffect, useCallback } from 'react';
import { X, Move, Maximize2, Copy } from 'lucide-react';
import { ImageElement, ViewportTransform, BoardThemeType } from '../../types/whiteboard';

interface MovableImageProps {
  element: ImageElement;
  transform: ViewportTransform;
  theme?: BoardThemeType;
  isSelected?: boolean;
  isHovered?: boolean;
  onSelect?: () => void;
  onChange: (updated: ImageElement) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (element: ImageElement) => void;
}

export const MovableImage: React.FC<MovableImageProps> = ({
  element,
  transform,
  isSelected = false,
  isHovered = false,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const currentWorldPosRef = useRef({ x: element.x, y: element.y });
  const dragStartRef = useRef<{ clientX: number; clientY: number; origX: number; origY: number }>({
    clientX: 0,
    clientY: 0,
    origX: element.x,
    origY: element.y,
  });

  const isResizingRef = useRef(false);
  const currentWorldSizeRef = useRef({ width: element.width, height: element.height });
  const resizeStartRef = useRef<{ clientX: number; clientY: number; origW: number; origH: number; aspect: number }>({
    clientX: 0,
    clientY: 0,
    origW: element.width,
    origH: element.height,
    aspect: element.width / Math.max(1, element.height),
  });

  // Keep world position & size synced when props change and not dragging/resizing
  useEffect(() => {
    if (!isDraggingRef.current) {
      currentWorldPosRef.current = { x: element.x, y: element.y };
    }
    if (!isResizingRef.current) {
      currentWorldSizeRef.current = { width: element.width, height: element.height };
    }
  }, [element.x, element.y, element.width, element.height]);

  // Screen coordinates
  const screenX = Math.round(element.x * transform.zoom + transform.x);
  const screenY = Math.round(element.y * transform.zoom + transform.y);
  const screenWidth = Math.round(element.width * transform.zoom);
  const screenHeight = Math.round(element.height * transform.zoom);

  const isVisibleControls = !element.isFixed && (isSelected || isHovered);

  // --- Hardware-Accelerated 120 FPS Dragging ---
  const handleDragPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: currentWorldPosRef.current.x,
      origY: currentWorldPosRef.current.y,
    };
    onSelect?.();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }, [onSelect]);

  const handleDragPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();

    const deltaScreenX = e.clientX - dragStartRef.current.clientX;
    const deltaScreenY = e.clientY - dragStartRef.current.clientY;

    const nextWorldX = Math.round(dragStartRef.current.origX + deltaScreenX / transform.zoom);
    const nextWorldY = Math.round(dragStartRef.current.origY + deltaScreenY / transform.zoom);

    currentWorldPosRef.current = { x: nextWorldX, y: nextWorldY };

    if (containerRef.current) {
      const nextScreenX = Math.round(nextWorldX * transform.zoom + transform.x);
      const nextScreenY = Math.round(nextWorldY * transform.zoom + transform.y);
      containerRef.current.style.left = `${nextScreenX}px`;
      containerRef.current.style.top = `${nextScreenY}px`;
    }
  }, [transform]);

  const handleDragPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    e.stopPropagation();
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    onChange({
      ...element,
      x: currentWorldPosRef.current.x,
      y: currentWorldPosRef.current.y,
      updatedAt: Date.now(),
    });
  }, [element, onChange]);

  // --- Hardware-Accelerated 120 FPS Resizing ---
  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    isResizingRef.current = true;
    resizeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origW: currentWorldSizeRef.current.width,
      origH: currentWorldSizeRef.current.height,
      aspect: currentWorldSizeRef.current.width / Math.max(1, currentWorldSizeRef.current.height),
    };
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }, []);

  const handleResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizingRef.current) return;
    e.stopPropagation();

    const deltaScreenX = e.clientX - resizeStartRef.current.clientX;
    const deltaWorldX = deltaScreenX / transform.zoom;

    let nextW = Math.max(100, Math.round(resizeStartRef.current.origW + deltaWorldX));
    let nextH: number;

    // Preserve aspect ratio unless shift key is pressed
    if (!e.shiftKey) {
      nextH = Math.max(60, Math.round(nextW / resizeStartRef.current.aspect));
    } else {
      const deltaScreenY = e.clientY - resizeStartRef.current.clientY;
      const deltaWorldY = deltaScreenY / transform.zoom;
      nextH = Math.max(60, Math.round(resizeStartRef.current.origH + deltaWorldY));
    }

    currentWorldSizeRef.current = { width: nextW, height: nextH };

    if (containerRef.current) {
      const nextScreenW = Math.round(nextW * transform.zoom);
      const nextScreenH = Math.round(nextH * transform.zoom);
      containerRef.current.style.width = `${nextScreenW}px`;
      containerRef.current.style.height = `${nextScreenH}px`;
    }
  }, [transform]);

  const handleResizePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isResizingRef.current) return;
    e.stopPropagation();
    isResizingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    onChange({
      ...element,
      width: currentWorldSizeRef.current.width,
      height: currentWorldSizeRef.current.height,
      updatedAt: Date.now(),
    });
  }, [element, onChange]);

  return (
    <div
      ref={containerRef}
      className={`absolute rounded-lg overflow-visible select-none pointer-events-none ${
        !element.isFixed && isSelected
          ? 'ring-2 ring-blue-500 shadow-md'
          : !element.isFixed && isHovered
          ? 'ring-1 ring-blue-400/50 shadow-sm'
          : ''
      }`}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
        zIndex: !element.isFixed && isSelected ? 25 : 5,
        touchAction: 'none',
      }}
    >
      {/* Floating Moving Icon Handle (Top-Left corner: Visible only on hover or click) */}
      {isVisibleControls && (
        <div
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerUp}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          style={{ zIndex: 30 }}
          title="Drag to move image"
          className="absolute top-2 left-2 w-7 h-7 rounded-md bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center cursor-grab active:cursor-grabbing shadow-sm pointer-events-auto transition-colors"
        >
          <Move className="w-3.5 h-3.5 text-blue-400 hover:text-white" />
        </div>
      )}

      {/* Floating Action Buttons (Top-Right: Duplicate & Close Button, visible only on hover or click) */}
      {isVisibleControls && (
        <div
          style={{ zIndex: 30 }}
          className="absolute top-2 right-2 flex items-center gap-1.5 pointer-events-auto"
        >
          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(element);
              }}
              title="Duplicate image"
              className="w-7 h-7 rounded-md bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center shadow-sm transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(element.id);
            }}
            title="Delete image"
            className="w-7 h-7 rounded-md bg-slate-900 border border-white/10 hover:bg-red-600/80 text-slate-300 hover:text-white flex items-center justify-center shadow-sm transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Image View (Under ink strokes, transparent to stylus/pen drawing events) */}
      <div
        style={{ zIndex: 5 }}
        className="w-full h-full rounded-lg overflow-hidden bg-black/20 flex items-center justify-center border border-white/10 pointer-events-none select-none"
      >
        <img
          src={element.src}
          alt="Pasted visual"
          draggable={false}
          className="w-full h-full object-contain pointer-events-none select-none"
        />
      </div>

      {/* Corner Resize Grip (Bottom-Right corner: Visible only on hover or click) */}
      {isVisibleControls && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          style={{ zIndex: 30 }}
          title="Drag to resize (Hold Shift for free-form)"
          className="absolute -bottom-2 -right-2 w-6 h-6 rounded-md bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-nwse-resize shadow-sm pointer-events-auto transition-colors"
        >
          <Maximize2 className="w-3 h-3 rotate-90" />
        </div>
      )}
    </div>
  );
};
