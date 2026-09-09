import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stroke, ViewportTransform, BoardThemeType } from '../../types/whiteboard';
import { Viewport } from '../../core/canvas/Viewport';
import { CanvasController } from '../../core/canvas/CanvasController';
import { Map, ChevronDown, ChevronUp } from 'lucide-react';

interface MinimapProps {
  strokes: Stroke[];
  transform: ViewportTransform;
  onTransformChange: (newTransform: ViewportTransform) => void;
  canvasWidth: number;
  canvasHeight: number;
  theme: BoardThemeType;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 130;

export const Minimap: React.FC<MinimapProps> = ({
  strokes,
  transform,
  onTransformChange,
  canvasWidth,
  canvasHeight,
  theme,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  // Calculate minimap coordinate mapping
  const getMapBounds = useCallback(() => {
    const contentBox = CanvasController.getContentBoundingBox(strokes);
    const viewportBox = Viewport.getVisibleWorldBounds(canvasWidth, canvasHeight, transform);

    const minX = Math.min(contentBox?.minX ?? viewportBox.minX, viewportBox.minX) - 200;
    const minY = Math.min(contentBox?.minY ?? viewportBox.minY, viewportBox.minY) - 200;
    const maxX = Math.max(contentBox?.maxX ?? viewportBox.maxX, viewportBox.maxX) + 200;
    const maxY = Math.max(contentBox?.maxY ?? viewportBox.maxY, viewportBox.maxY) + 200;

    const width = Math.max(800, maxX - minX);
    const height = Math.max(500, maxY - minY);

    return { minX, minY, maxX, maxY, width, height };
  }, [strokes, canvasWidth, canvasHeight, transform]);

  // Render Minimap
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bounds = getMapBounds();
    const scale = Math.min(MINIMAP_WIDTH / bounds.width, MINIMAP_HEIGHT / bounds.height);

    ctx.clearRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Background
    ctx.fillStyle = isDark ? '#1a1d24' : '#f1f5f9';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    ctx.save();
    // Center the map in canvas
    const offsetX = (MINIMAP_WIDTH - bounds.width * scale) / 2;
    const offsetY = (MINIMAP_HEIGHT - bounds.height * scale) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.translate(-bounds.minX, -bounds.minY);

    // Draw strokes
    for (const stroke of strokes) {
      if (stroke.isErased || stroke.points.length === 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(2, stroke.width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const pts = stroke.points;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
    }

    // Draw Visible Viewport Camera Box
    const viewportBox = Viewport.getVisibleWorldBounds(canvasWidth, canvasHeight, transform);

    ctx.fillStyle = isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(37, 99, 235, 0.15)';
    ctx.strokeStyle = isDark ? '#38bdf8' : '#2563eb';
    ctx.lineWidth = 2 / scale;

    ctx.fillRect(
      viewportBox.minX,
      viewportBox.minY,
      viewportBox.width,
      viewportBox.height
    );
    ctx.strokeRect(
      viewportBox.minX,
      viewportBox.minY,
      viewportBox.width,
      viewportBox.height
    );

    ctx.restore();
  }, [strokes, transform, canvasWidth, canvasHeight, isOpen, isDark, getMapBounds]);

  // Jump or Drag Viewport from Minimap Coordinates
  const handleMapPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const bounds = getMapBounds();
    const scale = Math.min(MINIMAP_WIDTH / bounds.width, MINIMAP_HEIGHT / bounds.height);
    const offsetX = (MINIMAP_WIDTH - bounds.width * scale) / 2;
    const offsetY = (MINIMAP_HEIGHT - bounds.height * scale) / 2;

    // Convert click in minimap to world coordinates
    const targetWorldX = bounds.minX + (clickX - offsetX) / scale;
    const targetWorldY = bounds.minY + (clickY - offsetY) / scale;

    // Center viewport on target world coordinates
    const newX = canvasWidth / 2 - targetWorldX * transform.zoom;
    const newY = canvasHeight / 2 - targetWorldY * transform.zoom;

    onTransformChange({
      x: newX,
      y: newY,
      zoom: transform.zoom,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    handleMapPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      handleMapPointer(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-30 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all select-none overflow-hidden ${
        isDark
          ? 'bg-slate-900/90 border-white/15 text-slate-200'
          : 'bg-white/90 border-slate-200/80 text-slate-800'
      }`}
    >
      {/* Minimap Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-white/5 border-b border-current/10 text-xs font-semibold"
      >
        <div className="flex items-center gap-1.5">
          <Map className="w-3.5 h-3.5 text-blue-400" />
          <span>Navigator</span>
        </div>
        <button className="p-0.5 opacity-70 hover:opacity-100">
          {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Minimap Canvas */}
      {isOpen && (
        <div className="p-1.5">
          <canvas
            ref={canvasRef}
            width={MINIMAP_WIDTH}
            height={MINIMAP_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="rounded-xl cursor-crosshair border border-current/10"
          />
        </div>
      )}
    </div>
  );
};
