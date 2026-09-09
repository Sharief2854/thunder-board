import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Pencil,
  Sun,
  Moon,
  Hand,
  ZoomIn,
  ZoomOut,
  Scan,
  Sliders,
  X,
  GripVertical,
  ChevronUp,
  Pin,
  PinOff,
  Code2,
  BrainCircuit,
  Type,
  Shapes,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Minus,
  Diamond,
  Star,
  Sparkles,
  Palette,
} from 'lucide-react';
import { BoardThemeType, StrokeTool, ShapeType } from '../../types/whiteboard';
import { WHITEBOARD_THEME, BLACKBOARD_THEME } from '../../types/theme';
import { VsCodeColorPicker } from './VsCodeColorPicker';

interface ToolbarProps {
  tool: StrokeTool;
  onSelectTool: (tool: StrokeTool) => void;
  color: string;
  onSelectColor: (color: string) => void;
  width: number;
  onSelectWidth: (width: number) => void;
  theme: BoardThemeType;
  onToggleTheme: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToContent: () => void;
  isCodeHighlightActive?: boolean;
  onToggleCodeHighlight?: () => void;
  onOpenModelTrainer?: () => void;
  onAddTextBox?: () => void;
  activeShapeType?: ShapeType;
  onSelectShapeType?: (shape: ShapeType) => void;
  isAutoSnapEnabled?: boolean;
  onToggleAutoSnap?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

const SHAPES_LIST: { id: ShapeType; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'rectangle', name: 'Rectangle', icon: Square },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'triangle', name: 'Triangle', icon: Triangle },
  { id: 'arrow', name: 'Arrow', icon: ArrowRight },
  { id: 'line', name: 'Line', icon: Minus },
  { id: 'diamond', name: 'Diamond', icon: Diamond },
  { id: 'star', name: 'Star', icon: Star },
];

const QUICK_WIDTH_PRESETS = [
  { label: '1px', value: 1, desc: 'Ultra Fine' },
  { label: '2px', value: 2, desc: 'Fine' },
  { label: '4px', value: 4, desc: 'Regular' },
  { label: '7px', value: 7, desc: 'Medium' },
  { label: '12px', value: 12, desc: 'Bold' },
  { label: '20px', value: 20, desc: 'Thick' },
  { label: '32px', value: 32, desc: 'Broad' },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onSelectTool,
  color,
  onSelectColor,
  width,
  onSelectWidth,
  theme,
  onToggleTheme,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToContent,
  isCodeHighlightActive = false,
  onToggleCodeHighlight,
  onOpenModelTrainer,
  onAddTextBox,
  activeShapeType = 'rectangle',
  onSelectShapeType,
  isAutoSnapEnabled = false,
  onToggleAutoSnap,
  isPinned: externalIsPinned,
  onTogglePin: externalOnTogglePin,
}) => {
  const [isSizePopoverOpen, setIsSizePopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isShapePopoverOpen, setIsShapePopoverOpen] = useState(false);
  const shapePopoverRef = useRef<HTMLDivElement>(null);
  const [isColorPopoverOpen, setIsColorPopoverOpen] = useState(false);
  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Maximum allowed custom pinned colors on the toolbar tab
  const MAX_PINNED_COLORS = 4;

  // Pinned colors state persisted in localStorage (enforcing max limit)
  const [pinnedColors, setPinnedColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('thunderboard_pinned_colors');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, MAX_PINNED_COLORS);
      }
    } catch {}
    return ['#ef4444', '#10b981', '#a855f7'];
  });

  const handleTogglePinColor = (targetColor: string) => {
    setPinnedColors(prev => {
      const exists = prev.some(c => c.toLowerCase() === targetColor.toLowerCase());
      let next: string[];
      if (exists) {
        next = prev.filter(c => c.toLowerCase() !== targetColor.toLowerCase());
      } else {
        if (prev.length >= MAX_PINNED_COLORS) return prev; // Limit reached (max 4)
        next = [...prev, targetColor];
      }
      try {
        localStorage.setItem('thunderboard_pinned_colors', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleUnpinColor = (targetColor: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedColors(prev => {
      const next = prev.filter(c => c.toLowerCase() !== targetColor.toLowerCase());
      try {
        localStorage.setItem('thunderboard_pinned_colors', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Pin state: external if provided, else fallback to local state
  const [internalIsPinned, setInternalIsPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('smartboard_toolbar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const isPinned = externalIsPinned !== undefined ? externalIsPinned : internalIsPinned;

  // Collapsed state: if unpinned, starts collapsed; if pinned, starts expanded
  const [isCollapsed, setIsCollapsed] = useState<boolean>(!isPinned);

  useEffect(() => {
    if (isPinned) {
      setIsCollapsed(false);
    }
  }, [isPinned]);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const themeConfig = theme === 'whiteboard' ? WHITEBOARD_THEME : BLACKBOARD_THEME;
  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  // Hover to open, leave to close
  const handleMouseEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsCollapsed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isPinned || isSizePopoverOpen || isShapePopoverOpen || isColorPopoverOpen) return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    // Small buffer of 250ms so accidental slight mouse slips don't collapse immediately
    leaveTimeoutRef.current = setTimeout(() => {
      setIsCollapsed(true);
      setIsSizePopoverOpen(false);
      setIsShapePopoverOpen(false);
      setIsColorPopoverOpen(false);
    }, 280);
  }, [isPinned, isSizePopoverOpen, isShapePopoverOpen, isColorPopoverOpen]);

  const handleTogglePin = useCallback(() => {
    if (externalOnTogglePin) {
      externalOnTogglePin();
      return;
    }
    setInternalIsPinned(prev => {
      const next = !prev;
      try {
        localStorage.setItem('smartboard_toolbar_pinned', String(next));
      } catch {}
      if (next) {
        setIsCollapsed(false);
      }
      return next;
    });
  }, [externalOnTogglePin]);

  // Close size, shape, and color popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsSizePopoverOpen(false);
      }
      if (shapePopoverRef.current && !shapePopoverRef.current.contains(e.target as Node)) {
        setIsShapePopoverOpen(false);
      }
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(e.target as Node)) {
        setIsColorPopoverOpen(false);
      }
    };

    if (isSizePopoverOpen || isShapePopoverOpen || isColorPopoverOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isSizePopoverOpen, isShapePopoverOpen, isColorPopoverOpen]);

  const handleToolClick = (selectedTool: StrokeTool) => {
    setIsColorPopoverOpen(false);
    if (selectedTool === 'shape') {
      setIsSizePopoverOpen(false);
      if (tool === 'shape') {
        setIsShapePopoverOpen(prev => !prev);
      } else {
        onSelectTool('shape');
        setIsShapePopoverOpen(true);
      }
      return;
    }

    setIsShapePopoverOpen(false);
    if (tool === selectedTool) {
      setIsSizePopoverOpen(prev => !prev);
    } else {
      onSelectTool(selectedTool);
    }
  };

  const getToolDisplayName = () => {
    switch (tool) {
      case 'pen':
        return 'Pen';
      case 'pencil':
        return 'Pencil';
      case 'highlighter':
        return 'Highlighter';
      case 'stroke-eraser':
        return 'Eraser';
      case 'pan':
        return 'Pan';
      case 'shape':
        return `Shape (${activeShapeType.charAt(0).toUpperCase() + activeShapeType.slice(1)})`;
      default:
        return 'Tool';
    }
  };

  const renderCurrentToolIcon = () => {
    switch (tool) {
      case 'pen':
        return <Pen className="w-4 h-4" />;
      case 'pencil':
        return <Pencil className="w-4 h-4" />;
      case 'highlighter':
        return <Highlighter className="w-4 h-4" />;
      case 'stroke-eraser':
        return <Eraser className="w-4 h-4" />;
      case 'pan':
        return <Hand className="w-4 h-4" />;
      case 'shape':
        return <Shapes className="w-4 h-4" />;
      default:
        return <Pen className="w-4 h-4" />;
    }
  };

  // --- Ultra-Smooth Dragging Implementation (60/120fps window listeners) ---
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const saved = localStorage.getItem('smartboard_toolbar_pos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);

  const handleGripPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!toolbarRef.current) return;
    const rect = toolbarRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = rect.left;
    const initY = rect.top;

    setIsDragging(true);

    let rafId: number | null = null;

    const onPointerMove = (ev: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const deltaX = ev.clientX - startX;
        const deltaY = ev.clientY - startY;

        const toolbarEl = toolbarRef.current;
        const w = toolbarEl ? toolbarEl.offsetWidth : 350;
        const h = toolbarEl ? toolbarEl.offsetHeight : 50;

        const newX = Math.max(10, Math.min(window.innerWidth - w - 10, initX + deltaX));
        const newY = Math.max(45, Math.min(window.innerHeight - h - 10, initY + deltaY));

        setPosition({ x: newX, y: newY });
      });
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;
      const toolbarEl = toolbarRef.current;
      const w = toolbarEl ? toolbarEl.offsetWidth : 350;
      const h = toolbarEl ? toolbarEl.offsetHeight : 50;
      const finalX = Math.max(10, Math.min(window.innerWidth - w - 10, initX + deltaX));
      const finalY = Math.max(45, Math.min(window.innerHeight - h - 10, initY + deltaY));
      const finalPos = { x: finalX, y: finalY };
      setPosition(finalPos);
      try {
        localStorage.setItem('smartboard_toolbar_pos', JSON.stringify(finalPos));
      } catch {}
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPosition(null);
    try {
      localStorage.removeItem('smartboard_toolbar_pos');
    } catch {}
  };

  const isTopPositioned = position !== null && position.y < 280;

  return (
    <div
      ref={toolbarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              transform: 'none',
              // NO transition on position during drag ensures 120fps smoothness!
              transition: isDragging ? 'none' : 'opacity 0.15s ease',
              willChange: isDragging ? 'left, top' : 'auto',
            }
          : {
              transition: isDragging ? 'none' : 'opacity 0.15s ease',
            }
      }
      className={`fixed z-40 flex flex-col items-center select-none ${
        position ? '' : 'bottom-6 left-1/2 -translate-x-1/2'
      } ${isDragging ? 'cursor-grabbing opacity-95' : ''}`}
    >
      {/* Interactive Stroke Size Adjustment Popover */}
      {isSizePopoverOpen && !isCollapsed && (
        <div
          ref={popoverRef}
          className={`p-4 rounded-2xl shadow-2xl backdrop-blur-2xl border w-72 transition-all animate-in fade-in ${
            isTopPositioned ? 'order-last mt-3 slide-in-from-top-3' : 'mb-3 slide-in-from-bottom-3'
          } ${
            isDark
              ? 'bg-slate-900/95 border-white/20 text-slate-100 shadow-[0_12px_36px_rgba(0,0,0,0.6)]'
              : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.15)]'
          }`}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-3 border-b border-current/15 mb-3">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>{getToolDisplayName()} Thickness:</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-400 font-mono text-xs">
                {width}px
              </span>
            </div>
            <button
              onClick={() => setIsSizePopoverOpen(false)}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real-Time Brush Size & Color Preview */}
          <div
            className={`h-16 rounded-xl flex items-center justify-center mb-3 border ${
              isDark ? 'bg-slate-950/60 border-white/10' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <div
              style={{
                width: `${Math.min(48, Math.max(2, width))}px`,
                height: `${Math.min(48, Math.max(2, width))}px`,
                backgroundColor: color,
                opacity: tool === 'highlighter' ? 0.4 : 1,
              }}
              className="rounded-full shadow-inner transition-all"
            />
          </div>

          {/* Interactive Range Slider (1px - 40px) */}
          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between text-[10px] opacity-60 font-mono">
              <span>1px</span>
              <span>20px</span>
              <span>40px</span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={width}
              onChange={e => onSelectWidth(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Quick Preset Pills */}
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_WIDTH_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => onSelectWidth(preset.value)}
                className={`py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-all text-center ${
                  width === preset.value
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 bg-black/5 dark:bg-white/5'
                }`}
                title={preset.desc}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Shape Picker Popover */}
      {isShapePopoverOpen && !isCollapsed && (
        <div
          ref={shapePopoverRef}
          className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-2xl border w-72 transition-all animate-in fade-in ${
            isTopPositioned ? 'order-last mt-3 slide-in-from-top-3' : 'mb-3 slide-in-from-bottom-3'
          } ${
            isDark
              ? 'bg-slate-900/95 border-white/20 text-slate-100 shadow-[0_12px_36px_rgba(0,0,0,0.6)]'
              : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.15)]'
          }`}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-current/15 mb-2.5">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Shapes className="w-3.5 h-3.5 text-blue-400" />
              <span>Geometric Shapes</span>
            </div>
            <button
              onClick={() => setIsShapePopoverOpen(false)}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Grid of Shapes */}
          <div className="grid grid-cols-4 gap-1.5 mb-2.5">
            {SHAPES_LIST.map(shape => {
              const IconComp = shape.icon;
              const isSelected = activeShapeType === shape.id && tool === 'shape';
              return (
                <button
                  key={shape.id}
                  onClick={() => {
                    onSelectShapeType?.(shape.id);
                    onSelectTool('shape');
                    setIsShapePopoverOpen(false);
                  }}
                  title={shape.name}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-center ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-400/80 shadow-md shadow-blue-500/25 scale-105'
                      : 'border-current/10 hover:border-current/30 hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
                  }`}
                >
                  <IconComp className="w-5 h-5 mb-1" />
                  <span className="text-[9px] font-medium leading-tight">{shape.name}</span>
                </button>
              );
            })}
          </div>

          {/* Auto-Snap Handwriting to Shapes Toggle */}
          {onToggleAutoSnap && (
            <div
              onClick={onToggleAutoSnap}
              className="flex items-center justify-between p-2 rounded-xl bg-black/10 dark:bg-white/5 border border-current/10 cursor-pointer hover:border-current/25 transition-all"
            >
              <div className="flex items-center gap-2">
                <Sparkles className={`w-3.5 h-3.5 ${isAutoSnapEnabled ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                <div className="text-left">
                  <div className="text-[11px] font-bold leading-tight">Auto-Snap Shapes</div>
                  <div className="text-[9px] opacity-60">Snap rough loops & boxes as you draw</div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-colors ${
                  isAutoSnapEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-black/10 dark:bg-white/10 opacity-60'
                }`}
              >
                {isAutoSnapEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* VS Code-Style Interactive Custom Color Selector & Palette Popover */}
      {isColorPopoverOpen && !isCollapsed && (
        <div
          ref={colorPopoverRef}
          className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-2xl border w-[308px] transition-all animate-in fade-in ${
            isTopPositioned ? 'order-last mt-3 slide-in-from-top-3' : 'mb-3 slide-in-from-bottom-3'
          } ${
            isDark
              ? 'bg-slate-900/95 border-white/20 text-slate-100 shadow-[0_12px_36px_rgba(0,0,0,0.6)]'
              : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.15)]'
          }`}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-current/15 mb-2.5">
            <div className="flex items-center gap-2 font-bold text-xs">
              <Palette className="w-3.5 h-3.5 text-blue-400" />
              <span>Color Studio</span>
            </div>
            <button
              onClick={() => setIsColorPopoverOpen(false)}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <VsCodeColorPicker
            color={color}
            onChangeColor={onSelectColor}
            pinnedColors={pinnedColors}
            onTogglePinColor={handleTogglePinColor}
            onUnpinColor={handleUnpinColor}
            onClearPinnedColors={() => {
              setPinnedColors([]);
              try {
                localStorage.removeItem('thunderboard_pinned_colors');
              } catch {}
            }}
            isDark={isDark}
            maxPinnedColors={MAX_PINNED_COLORS}
          />
        </div>
      )}

      {/* STATE 1: COMPACT COLLAPSED BUBBLE (Grows on hover) */}
      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl shadow-2xl backdrop-blur-xl border cursor-pointer transition-all hover:scale-105 animate-in fade-in zoom-in-95 ${
            isDark
              ? 'bg-slate-900/90 border-white/20 text-slate-100 hover:border-blue-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
              : 'bg-white/95 border-slate-200 text-slate-800 hover:border-blue-500/60 shadow-[0_10px_30px_rgba(0,0,0,0.12)]'
          }`}
          title="Hover to expand tools (Drag handle to move • Double-click handle to reset)"
        >
          {/* Smooth Drag Grip on Collapsed Bubble */}
          <div
            onPointerDown={handleGripPointerDown}
            onDoubleClick={handleResetPosition}
            title="Drag to move toolbar (Double-click to reset)"
            className="flex items-center justify-center p-1 -ml-1 rounded-lg cursor-grab active:cursor-grabbing hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 touch-none border-r border-current/15 pr-1.5"
          >
            <GripVertical className="w-3.5 h-3.5 text-blue-400" />
          </div>

          {/* Current Tool Preview */}
          <div className="flex items-center gap-1.5 font-bold text-xs pointer-events-none">
            <span className="text-blue-400">{renderCurrentToolIcon()}</span>
            <div
              style={{ backgroundColor: color }}
              className="w-3 h-3 rounded-full border border-white/30 shadow-sm"
            />
            <span className="font-mono opacity-80 text-[11px]">{width}px</span>
          </div>

          {/* Expand Hint */}
          <div className="pl-1 border-l border-current/15 text-blue-400 opacity-80 flex items-center">
            <ChevronUp className="w-3.5 h-3.5" />
          </div>
        </div>
      ) : (
        /* STATE 2: FULL EXPANDED TOOLBAR (Closes on mouse leave unless pinned) */
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-in fade-in zoom-in-95 ${
            isDark
              ? 'bg-slate-900/90 border-white/15 text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
              : 'bg-white/90 border-slate-200/80 text-slate-800 shadow-[0_16px_40px_rgba(0,0,0,0.15)]'
          }`}
        >
          {/* Movable Drag Grip Handle */}
          <div
            onPointerDown={handleGripPointerDown}
            onDoubleClick={handleResetPosition}
            title="Drag to move toolbar anywhere on screen (Double-click to reset)"
            className="flex items-center justify-center p-1.5 -ml-1 mr-0.5 rounded-xl cursor-grab active:cursor-grabbing hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100 transition-opacity touch-none border-r border-current/15 pr-2"
          >
            <GripVertical className="w-4 h-4 text-blue-400" />
          </div>

          {/* Primary Inking & Navigation Tools */}
          <div className="flex items-center gap-1 border-r border-current/15 pr-2">
            <button
              onClick={() => handleToolClick('pen')}
              title="Smooth Pen [P] (Click to select, click again to adjust size)"
              className={`p-2 rounded-xl transition-all relative ${
                tool === 'pen'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25 scale-105'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
              }`}
            >
              <Pen className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleToolClick('pencil')}
              title="Pencil (Click to select, click again to adjust size)"
              className={`p-2 rounded-xl transition-all relative ${
                tool === 'pencil'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25 scale-105'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
              }`}
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleToolClick('highlighter')}
              title="Highlighter [H] (Click to select, click again to adjust size)"
              className={`p-2 rounded-xl transition-all relative ${
                tool === 'highlighter'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-105'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
              }`}
            >
              <Highlighter className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleToolClick('stroke-eraser')}
              title="Stroke Eraser [E] (Shortcut: Press 'E', flip stylus, or hold side button)"
              className={`p-2 rounded-xl transition-all relative ${
                tool === 'stroke-eraser'
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/25 scale-105'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
              }`}
            >
              <Eraser className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectTool('pan')}
              title="Pan / Hand Tool [Space] (or hold Spacebar to Pan)"
              className={`p-2 rounded-xl transition-all ${
                tool === 'pan'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-105'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>

            {/* Geometric Shapes Tool */}
            <button
              onClick={() => handleToolClick('shape')}
              title="Geometric Shapes [S] (Click to pick & draw Rectangle, Circle, Triangle, Arrow, Line, Diamond, Star)"
              className={`p-2 rounded-xl transition-all relative ${
                tool === 'shape'
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25 scale-105'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 hover:text-blue-400'
              }`}
            >
              <Shapes className="w-4 h-4" />
              {tool === 'shape' && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-400 rounded-full ring-2 ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* Movable Text Box / Code Box Creator */}
            {onAddTextBox && (
              <button
                onClick={onAddTextBox}
                title="Add Movable Text / Code Box [T] (Type normal text or syntax-highlighted code and drag anywhere!)"
                className="p-2 rounded-xl transition-all hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 hover:text-purple-400"
              >
                <Type className="w-4 h-4" />
              </button>
            )}

            {/* In-Place Handwritten Syntax Highlighter Toggle */}
            <button
              onClick={onToggleCodeHighlight}
              title={
                isCodeHighlightActive
                  ? "Syntax Highlighter: ACTIVE [C] (Keywords, strings, tags & numbers highlight automatically in-place)"
                  : "Syntax Highlighter: OFF [C] (Click to auto-highlight code keywords as you write)"
              }
              className={`p-2 rounded-xl transition-all relative flex items-center justify-center ${
                isCodeHighlightActive
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30 scale-105 ring-2 ring-purple-400/50'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100'
              }`}
            >
              <Code2 className="w-4 h-4" />
              {isCodeHighlightActive && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900 animate-pulse" />
              )}
            </button>

            {/* Model Trainer Studio Button */}
            {onOpenModelTrainer && (
              <button
                onClick={onOpenModelTrainer}
                title="Model Trainer Studio: Train your own handwriting for curly braces { }, HTML tags, brackets and keywords!"
                className="p-2 rounded-xl transition-all relative flex items-center justify-center hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 hover:scale-105 active:scale-95"
              >
                <BrainCircuit className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Size Trigger / Pill */}
          <div className="flex items-center border-r border-current/15 pr-2">
            <button
              onClick={() => setIsSizePopoverOpen(prev => !prev)}
              title="Adjust Brush / Pen Size (Slider & Presets)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all border ${
                isSizePopoverOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 bg-black/5 dark:bg-white/5 border-current/15 opacity-90 hover:opacity-100'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <div
                style={{
                  width: `${Math.min(10, Math.max(3, width / 2))}px`,
                  height: `${Math.min(10, Math.max(3, width / 2))}px`,
                  backgroundColor: color,
                }}
                className="rounded-full shadow-sm"
              />
              <span>{width}px</span>
            </button>
          </div>

          {/* Adaptive Theme Color Swatches + Pinned Colors + Custom Color Selector Trigger */}
          <div className="flex items-center gap-1.5 border-r border-current/15 pr-2">
            {/* Theme default swatches */}
            {themeConfig.penColors.map(c => (
              <button
                key={c.value}
                onClick={() => onSelectColor(c.value)}
                title={`Theme Color: ${c.name}`}
                style={{ backgroundColor: c.value }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color.toLowerCase() === c.value.toLowerCase()
                    ? 'scale-110 border-blue-500 shadow-md ring-2 ring-blue-400/40'
                    : 'border-white/30 hover:scale-105'
                }`}
              />
            ))}

            {/* Pinned custom colors */}
            {pinnedColors.length > 0 && (
              <>
                <div className="w-[1px] h-4 bg-current/20 mx-0.5" />
                {pinnedColors.map(pinnedColor => {
                  const isSelected = color.toLowerCase() === pinnedColor.toLowerCase();
                  return (
                    <div key={pinnedColor} className="relative group flex items-center justify-center">
                      <button
                        onClick={() => onSelectColor(pinnedColor)}
                        title={`Pinned Color: ${pinnedColor} (Click to select, hover for × unpin)`}
                        style={{ backgroundColor: pinnedColor }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          isSelected
                            ? 'scale-110 border-blue-500 shadow-md ring-2 ring-blue-400/40'
                            : 'border-white/30 hover:scale-105'
                        }`}
                      />
                      {/* Hover unpin button */}
                      <button
                        onClick={(e) => handleUnpinColor(pinnedColor, e)}
                        title="Unpin this color"
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Custom Color Selector & Palette Popover Trigger */}
            <button
              onClick={() => {
                setIsSizePopoverOpen(false);
                setIsShapePopoverOpen(false);
                setIsColorPopoverOpen(prev => !prev);
              }}
              title="Open Color Studio (Custom color picker, 24-color palette, & pin colors to toolbar)"
              className={`relative p-1.5 rounded-xl border transition-all flex items-center justify-center ${
                isColorPopoverOpen
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30 scale-105'
                  : 'hover:bg-black/10 dark:hover:bg-white/10 bg-black/5 dark:bg-white/5 border-current/15 opacity-80 hover:opacity-100'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black/40 dark:border-white/40 shadow-xs"
                style={{ backgroundColor: color }}
              />
            </button>
          </div>

          {/* Undo / Redo / Clear */}
          <div className="flex items-center gap-1 border-r border-current/15 pr-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClear}
              title="Clear Board"
              className="p-2 rounded-xl hover:bg-red-500/20 hover:text-red-400 opacity-75 hover:opacity-100 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r border-current/15 pr-2">
            <button
              onClick={onZoomOut}
              title="Zoom Out"
              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-all"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={onResetZoom}
              title="Reset Zoom (Ctrl+0)"
              className="px-2 py-1 text-[11px] font-mono rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-90 hover:opacity-100"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={onZoomIn}
              title="Zoom In"
              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-all"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={onFitToContent}
              title="Fit All Content to Screen"
              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-all"
            >
              <Scan className="w-4 h-4" />
            </button>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center border-r border-current/15 pr-2">
            <button
              onClick={onToggleTheme}
              title={`Toggle Theme (Current: ${theme})`}
              className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-all"
            >
              {theme === 'whiteboard' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>

          {/* Pin Toggle Control */}
          <div className="flex items-center pl-0.5">
            <button
              onClick={handleTogglePin}
              title={
                isPinned
                  ? 'Pinned: Always open (Click to enable auto-close on mouse leave)'
                  : 'Unpinned: Opens on hover, closes on mouse leave (Click to keep always open)'
              }
              className={`p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold ${
                isPinned
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
              <span className="text-[10px] hidden sm:inline">{isPinned ? 'Pinned' : 'Auto'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
