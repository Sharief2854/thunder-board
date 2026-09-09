import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Move,
  Maximize2,
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup'; // HTML / XML
import { TextBoxElement, ViewportTransform, BoardThemeType } from '../../types/whiteboard';

interface MovableTextBoxProps {
  element: TextBoxElement;
  transform: ViewportTransform;
  theme: BoardThemeType;
  isSelected?: boolean;
  onSelect?: () => void;
  onChange: (updated: TextBoxElement) => void;
  onDelete: (id: string) => void;
}

export const MovableTextBox: React.FC<MovableTextBoxProps> = ({
  element,
  transform,
  theme,
  isSelected = false,
  onSelect,
  onChange,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // References for direct 120fps hardware-accelerated movement & resizing
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const resizeStartRef = useRef<{ clientX: number; clientY: number; origW: number; origH: number }>({
    clientX: 0,
    clientY: 0,
    origW: element.width,
    origH: element.height,
  });

  // Keep world position & size synced when props change and not actively dragging/resizing
  useEffect(() => {
    if (!isDraggingRef.current) {
      currentWorldPosRef.current = { x: element.x, y: element.y };
    }
    if (!isResizingRef.current) {
      currentWorldSizeRef.current = { width: element.width, height: element.height };
    }
  }, [element.x, element.y, element.width, element.height]);

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  // Screen coordinates computed from zoom & pan
  const screenX = element.x * transform.zoom + transform.x;
  const screenY = element.y * transform.zoom + transform.y;
  const screenWidth = Math.max(140, element.width * transform.zoom);
  const screenHeight = Math.max(70, element.height * transform.zoom);

  // Update container DOM directly when transform (zoom/pan) changes
  useEffect(() => {
    if (containerRef.current && !isDraggingRef.current && !isResizingRef.current) {
      containerRef.current.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
      containerRef.current.style.width = `${screenWidth}px`;
      containerRef.current.style.minHeight = `${screenHeight}px`;
    }
  }, [screenX, screenY, screenWidth, screenHeight]);

  // Ultra-Smooth Dragging Handler (Direct GPU translate3d with PointerCapture)
  const handleDragPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    isDraggingRef.current = true;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: currentWorldPosRef.current.x,
      origY: currentWorldPosRef.current.y,
    };

    if (containerRef.current) {
      containerRef.current.style.willChange = 'transform';
      containerRef.current.style.transition = 'none';
    }

    let rafId: number | null = null;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const dx = (moveEvent.clientX - dragStartRef.current.clientX) / transform.zoom;
      const dy = (moveEvent.clientY - dragStartRef.current.clientY) / transform.zoom;

      const newX = Math.round(dragStartRef.current.origX + dx);
      const newY = Math.round(dragStartRef.current.origY + dy);

      currentWorldPosRef.current = { x: newX, y: newY };

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (containerRef.current) {
          const curScreenX = newX * transform.zoom + transform.x;
          const curScreenY = newY * transform.zoom + transform.y;
          containerRef.current.style.transform = `translate3d(${curScreenX}px, ${curScreenY}px, 0)`;
        }
      });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      isDraggingRef.current = false;
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {}

      if (rafId) cancelAnimationFrame(rafId);

      if (containerRef.current) {
        containerRef.current.style.willChange = 'auto';
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      // Commit final position to batch state
      onChange({
        ...element,
        x: currentWorldPosRef.current.x,
        y: currentWorldPosRef.current.y,
        updatedAt: Date.now(),
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Ultra-Smooth Resizing Handler (Direct DOM width/height with PointerCapture)
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect?.();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    isResizingRef.current = true;
    resizeStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origW: currentWorldSizeRef.current.width,
      origH: currentWorldSizeRef.current.height,
    };

    if (containerRef.current) {
      containerRef.current.style.willChange = 'width, min-height';
      containerRef.current.style.transition = 'none';
    }

    let rafId: number | null = null;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isResizingRef.current) return;

      const dw = (moveEvent.clientX - resizeStartRef.current.clientX) / transform.zoom;
      const dh = (moveEvent.clientY - resizeStartRef.current.clientY) / transform.zoom;

      const newW = Math.max(140, Math.round(resizeStartRef.current.origW + dw));
      const newH = Math.max(70, Math.round(resizeStartRef.current.origH + dh));

      currentWorldSizeRef.current = { width: newW, height: newH };

      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.width = `${newW * transform.zoom}px`;
          containerRef.current.style.minHeight = `${newH * transform.zoom}px`;
        }
      });
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      isResizingRef.current = false;
      try {
        target.releasePointerCapture(upEvent.pointerId);
      } catch {}

      if (rafId) cancelAnimationFrame(rafId);

      if (containerRef.current) {
        containerRef.current.style.willChange = 'auto';
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);

      // Commit final dimensions to batch state
      onChange({
        ...element,
        width: currentWorldSizeRef.current.width,
        height: currentWorldSizeRef.current.height,
        updatedAt: Date.now(),
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Highlighted HTML generator using PrismJS for code mode or clean text
  const getHighlightedHtml = useCallback(() => {
    if (!element.content) {
      return `<span style="opacity: 0.35; font-style: italic;">${
        element.mode === 'code' ? '// Write code here...' : 'Type note here...'
      }</span>`;
    }

    if (element.mode === 'text') {
      return element.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
    }

    try {
      const grammar = Prism.languages[element.language] || Prism.languages.javascript;
      return Prism.highlight(element.content, grammar, element.language || 'javascript');
    } catch {
      return element.content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [element.content, element.mode, element.language]);

  return (
    <div
      ref={containerRef}
      onClick={e => {
        e.stopPropagation();
        onSelect?.();
      }}
      style={{
        transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
        width: `${screenWidth}px`,
        minHeight: `${screenHeight}px`,
      }}
      className={`absolute top-0 left-0 z-30 rounded-lg select-none border transition-[border-color,box-shadow] duration-150 ${
        isSelected
          ? 'border-purple-500/80 shadow-md ring-1 ring-purple-500/30'
          : 'border-current/15'
      } ${
        isDark
          ? 'bg-slate-950/60 text-slate-100 backdrop-blur-sm'
          : 'bg-white/80 text-slate-800 backdrop-blur-sm'
      }`}
    >
      {/* Close button at top-right corner (Always visible, clean minimal styling) */}
      <button
        onClick={e => {
          e.stopPropagation();
          onDelete(element.id);
        }}
        title="Close"
        className="absolute top-1.5 right-1.5 z-40 p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Main Text Content Area */}
      <div
        className="w-full h-full pt-2 pb-6 pl-2.5 pr-7 overflow-auto cursor-text"
        onClick={() => {
          setIsEditing(true);
          setTimeout(() => textareaRef.current?.focus(), 50);
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={element.content}
            onChange={e =>
              onChange({
                ...element,
                content: e.target.value,
                updatedAt: Date.now(),
              })
            }
            onBlur={() => setIsEditing(false)}
            placeholder={element.mode === 'code' ? '// Write code here...' : 'Type note here...'}
            style={{
              fontSize: `${element.fontSize * transform.zoom}px`,
              lineHeight: 1.4,
            }}
            className={`w-full h-full min-h-[44px] bg-transparent resize-none border-none outline-none focus:ring-0 ${
              element.mode === 'code' ? 'font-mono' : 'font-sans'
            }`}
          />
        ) : (
          <div
            style={{
              fontSize: `${element.fontSize * transform.zoom}px`,
              lineHeight: 1.4,
            }}
            className={`w-full h-full min-h-[44px] whitespace-pre-wrap select-text ${
              element.mode === 'code' ? 'font-mono' : 'font-sans'
            }`}
            dangerouslySetInnerHTML={{ __html: getHighlightedHtml() }}
          />
        )}
      </div>

      {/* Moving Box Button at Bottom-Left Corner (Always visible, drag to move) */}
      <div
        onPointerDown={handleDragPointerDown}
        title="Drag to move box"
        className="absolute bottom-1.5 left-1.5 z-40 p-1 rounded-md text-slate-400 hover:text-purple-400 hover:bg-purple-500/15 cursor-move active:cursor-grabbing transition-colors flex items-center justify-center touch-none"
      >
        <Move className="w-3.5 h-3.5" />
      </div>

      {/* Resize Handle at Bottom-Right Corner (Always visible) */}
      <div
        onPointerDown={handleResizePointerDown}
        title="Drag to resize box"
        className="absolute bottom-1.5 right-1.5 z-40 p-1 rounded-md text-slate-400 hover:text-purple-400 hover:bg-purple-500/15 cursor-se-resize transition-colors flex items-center justify-center touch-none"
      >
        <Maximize2 className="w-3 h-3 rotate-90" />
      </div>
    </div>
  );
};
