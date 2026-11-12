import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Pencil,
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
  Palette,
  ExternalLink,
} from 'lucide-react';
import { BoardThemeType, StrokeTool, ShapeType } from '../../types/whiteboard';
import { BLACKBOARD_THEME } from '../../types/theme';
import { ToolbarPropertiesModal } from './ToolbarPropertiesModal';
import { ToolbarShapesPopover } from './ToolbarShapesPopover';

interface ToolbarProps {
  tool: StrokeTool;
  onSelectTool: (tool: StrokeTool) => void;
  color: string;
  onSelectColor: (color: string) => void;
  width: number;
  onSelectWidth: (width: number) => void;
  theme?: BoardThemeType;
  onToggleTheme?: () => void;
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
  onUndockBoard?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  onSelectTool,
  color,
  onSelectColor,
  width,
  onSelectWidth,
  theme: _theme,
  onToggleTheme: _onToggleTheme,
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
  onUndockBoard,
}) => {
  // Unified Tool Properties Modal (Thickness / Size & Color Studio tabs)
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'size' | 'color'>('size');
  const [modalPos, setModalPos] = useState({ left: 12, caretOffset: 40 });

  // Shape picker popover state & anchor positioning
  const [isShapePopoverOpen, setIsShapePopoverOpen] = useState(false);
  const [shapeModalPos, setShapeModalPos] = useState({ left: 100, caretOffset: 40 });

  const popoverRef = useRef<HTMLDivElement>(null);
  const shapePopoverRef = useRef<HTMLDivElement>(null);
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

  const themeConfig = BLACKBOARD_THEME;
  const isDark = true;

  // Hover to open, leave to close
  const handleMouseEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setIsCollapsed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isPinned || isPropertiesModalOpen || isShapePopoverOpen) return;
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    // Small buffer of 250ms so accidental slight mouse slips don't collapse immediately
    leaveTimeoutRef.current = setTimeout(() => {
      setIsCollapsed(true);
      setIsPropertiesModalOpen(false);
      setIsShapePopoverOpen(false);
    }, 280);
  }, [isPinned, isPropertiesModalOpen, isShapePopoverOpen]);

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

  // Close properties and shape modals on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      // If clicking inside toolbarRef, let button handlers manage toggling
      if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) {
        return;
      }
      setIsPropertiesModalOpen(false);
      setIsShapePopoverOpen(false);
    };

    if (isPropertiesModalOpen || isShapePopoverOpen) {
      window.addEventListener('mousedown', handleOutsideClick);
    }
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isPropertiesModalOpen, isShapePopoverOpen]);

  const openPropertiesModal = (
    tab: 'size' | 'color',
    triggerEl?: HTMLElement | null
  ) => {
    setIsShapePopoverOpen(false);
    setActiveModalTab(tab);

    if (triggerEl && toolbarRef.current) {
      const triggerRect = triggerEl.getBoundingClientRect();
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      const relativeCenter = triggerRect.left + triggerRect.width / 2 - toolbarRect.left;
      const modalWidth = 330;
      const toolbarW = toolbarRect.width;
      const targetLeft = Math.max(8, Math.min(toolbarW - modalWidth - 8, relativeCenter - modalWidth / 2));
      const caretOffset = Math.max(16, Math.min(modalWidth - 16, relativeCenter - targetLeft));
      setModalPos({ left: targetLeft, caretOffset });
    }

    setIsPropertiesModalOpen(true);
  };

  const openShapeModal = (triggerEl?: HTMLElement | null) => {
    setIsPropertiesModalOpen(false);

    if (triggerEl && toolbarRef.current) {
      const triggerRect = triggerEl.getBoundingClientRect();
      const toolbarRect = toolbarRef.current.getBoundingClientRect();
      const relativeCenter = triggerRect.left + triggerRect.width / 2 - toolbarRect.left;
      const modalWidth = 288;
      const toolbarW = toolbarRect.width;
      const targetLeft = Math.max(8, Math.min(toolbarW - modalWidth - 8, relativeCenter - modalWidth / 2));
      const caretOffset = Math.max(16, Math.min(modalWidth - 16, relativeCenter - targetLeft));
      setShapeModalPos({ left: targetLeft, caretOffset });
    }

    setIsShapePopoverOpen(prev => !prev);
  };

  const handleToolClick = (selectedTool: StrokeTool, e?: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedTool === 'shape') {
      openShapeModal(e?.currentTarget);
      return;
    }

    if (tool === selectedTool) {
      if (isPropertiesModalOpen && activeModalTab === 'size') {
        setIsPropertiesModalOpen(false);
      } else {
        openPropertiesModal('size', e?.currentTarget);
      }
    } else {
      onSelectTool(selectedTool);
      if (isPropertiesModalOpen) {
        openPropertiesModal(activeModalTab, e?.currentTarget);
      }
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

    // Close any open popovers on drag start for fluid movement
    setIsPropertiesModalOpen(false);
    setIsShapePopoverOpen(false);

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
    setIsPropertiesModalOpen(false);
    setIsShapePopoverOpen(false);
    try {
      localStorage.removeItem('smartboard_toolbar_pos');
    } catch {}
  };

  // If toolbar is dragged into top 380px of screen, modals open below; otherwise they open above
  const isTopPositioned = position !== null && position.y < 380;

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
      {/* STATE 1: COMPACT COLLAPSED BUBBLE */}
      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-md border cursor-pointer transition-colors ${
            isDark
              ? 'bg-slate-900 border-white/10 text-slate-100 hover:border-slate-700'
              : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
          }`}
          title="Click or hover to expand tools (Drag handle to move • Double-click handle to reset)"
        >
          {/* Drag Grip on Collapsed Bubble */}
          <div
            onPointerDown={handleGripPointerDown}
            onDoubleClick={handleResetPosition}
            title="Drag to move toolbar (Double-click to reset)"
            className="flex items-center justify-center p-1 -ml-1 rounded-md cursor-grab active:cursor-grabbing hover:bg-white/5 opacity-60 hover:opacity-100 touch-none border-r border-white/10 pr-1.5 transition-colors"
          >
            <GripVertical className="w-3.5 h-3.5 text-blue-400" />
          </div>

          {/* Current Tool Preview */}
          <div className="flex items-center gap-1.5 font-medium text-xs pointer-events-none">
            <span className="text-blue-400">{renderCurrentToolIcon()}</span>
            <div
              style={{ backgroundColor: color }}
              className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs"
            />
            <span className="font-mono opacity-80 text-[11px]">{width}px</span>
          </div>

          {/* Expand Hint */}
          <div className="pl-1 border-l border-white/10 text-blue-400 opacity-80 flex items-center">
            <ChevronUp className="w-3.5 h-3.5" />
          </div>
        </div>
      ) : (
        /* STATE 2: FULL EXPANDED TOOLBAR */
        <div
          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl shadow-xl border select-none ${
            isDark
              ? 'bg-slate-900 border-white/10 text-slate-100'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          {/* Unified Tool Properties Modal (Thickness / Size & Color Studio tabs) */}
          {isPropertiesModalOpen && (
            <ToolbarPropertiesModal
              popoverRef={popoverRef}
              modalPos={modalPos}
              isTopPositioned={isTopPositioned}
              activeModalTab={activeModalTab}
              setActiveModalTab={setActiveModalTab}
              width={width}
              onSelectWidth={onSelectWidth}
              color={color}
              onSelectColor={onSelectColor}
              tool={tool}
              pinnedColors={pinnedColors}
              onTogglePinColor={handleTogglePinColor}
              onUnpinColor={handleUnpinColor}
              onClearPinnedColors={() => {
                setPinnedColors([]);
                try {
                  localStorage.removeItem('thunderboard_pinned_colors');
                } catch {}
              }}
              maxPinnedColors={MAX_PINNED_COLORS}
              isDark={isDark}
              onClose={() => setIsPropertiesModalOpen(false)}
              toolDisplayName={getToolDisplayName()}
            />
          )}

          {/* Anchored Geometric Shape Picker Popover */}
          {isShapePopoverOpen && (
            <ToolbarShapesPopover
              popoverRef={shapePopoverRef}
              modalPos={shapeModalPos}
              isTopPositioned={isTopPositioned}
              activeShapeType={activeShapeType}
              tool={tool}
              isAutoSnapEnabled={isAutoSnapEnabled}
              onSelectShapeType={onSelectShapeType}
              onSelectTool={onSelectTool}
              onToggleAutoSnap={onToggleAutoSnap}
              onClose={() => setIsShapePopoverOpen(false)}
            />
          )}
          {/* Movable Drag Grip Handle */}
          <div
            onPointerDown={handleGripPointerDown}
            onDoubleClick={handleResetPosition}
            title="Drag to move toolbar (Double-click to reset)"
            className="flex items-center justify-center p-1.5 rounded-lg cursor-grab active:cursor-grabbing text-slate-400 hover:text-white hover:bg-white/5 transition-colors touch-none border-r border-white/10 pr-2 mr-0.5"
          >
            <GripVertical className="w-4 h-4 text-slate-400" />
          </div>

          {/* Primary Inking & Navigation Tools */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            <button
              onClick={(e) => handleToolClick('pen', e)}
              title="Pen [P]"
              className={`p-2 rounded-lg transition-colors relative ${
                tool === 'pen'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Pen className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => handleToolClick('pencil', e)}
              title="Pencil"
              className={`p-2 rounded-lg transition-colors relative ${
                tool === 'pencil'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => handleToolClick('highlighter', e)}
              title="Highlighter [H]"
              className={`p-2 rounded-lg transition-colors relative ${
                tool === 'highlighter'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Highlighter className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => handleToolClick('stroke-eraser', e)}
              title="Eraser [E]"
              className={`p-2 rounded-lg transition-colors relative ${
                tool === 'stroke-eraser'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Eraser className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectTool('pan')}
              title="Pan [Space]"
              className={`p-2 rounded-lg transition-colors ${
                tool === 'pan'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>

            {/* Geometric Shapes Tool */}
            <button
              onClick={(e) => handleToolClick('shape', e)}
              title="Geometric Shapes [S]"
              className={`p-2 rounded-lg transition-colors relative ${
                tool === 'shape' || isShapePopoverOpen
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shapes className="w-4 h-4" />
              {tool === 'shape' && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-300 rounded-full" />
              )}
            </button>

            {/* Movable Text Box / Code Box Creator */}
            {onAddTextBox && (
              <button
                onClick={onAddTextBox}
                title="Add Movable Text / Code Box [T]"
                className="p-2 rounded-lg transition-colors text-slate-300 hover:text-white hover:bg-white/5"
              >
                <Type className="w-4 h-4" />
              </button>
            )}

            {/* In-Place Handwritten Syntax Highlighter Toggle */}
            <button
              onClick={onToggleCodeHighlight}
              title={
                isCodeHighlightActive
                  ? "Syntax Highlighter: ACTIVE [C]"
                  : "Syntax Highlighter: OFF [C]"
              }
              className={`p-2 rounded-lg transition-colors relative flex items-center justify-center ${
                isCodeHighlightActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Code2 className="w-4 h-4" />
              {isCodeHighlightActive && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            {/* Model Trainer Studio Button */}
            {onOpenModelTrainer && (
              <button
                onClick={onOpenModelTrainer}
                title="Model Trainer Studio"
                className="p-2 rounded-lg transition-colors relative flex items-center justify-center text-purple-400 hover:text-purple-300 hover:bg-white/5"
              >
                <BrainCircuit className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Size Trigger / Pill */}
          <div className="flex items-center border-r border-white/10 pr-2">
            <button
              onClick={(e) => {
                if (isPropertiesModalOpen && activeModalTab === 'size') {
                  setIsPropertiesModalOpen(false);
                } else {
                  openPropertiesModal('size', e.currentTarget);
                }
              }}
              title="Adjust Brush / Pen Thickness & Color (Slider & Presets)"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-xs font-medium transition-colors border ${
                isPropertiesModalOpen && activeModalTab === 'size'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'hover:bg-white/10 bg-white/5 border-white/10 text-slate-300 hover:text-white'
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
          <div className="flex items-center gap-1.5 border-r border-white/10 pr-2">
            {/* Theme default swatches */}
            {themeConfig.penColors.map(c => {
              const isSelected = color.toLowerCase() === c.value.toLowerCase();
              return (
                <button
                  key={c.value}
                  onClick={() => onSelectColor(c.value)}
                  title={`Color: ${c.name}`}
                  style={{ backgroundColor: c.value }}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    isSelected
                      ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 border-white'
                      : 'border-white/20 hover:border-white/60'
                  }`}
                />
              );
            })}

            {/* Pinned custom colors */}
            {pinnedColors.length > 0 && (
              <>
                <div className="w-[1px] h-4 bg-white/20 mx-0.5" />
                {pinnedColors.map(pinnedColor => {
                  const isSelected = color.toLowerCase() === pinnedColor.toLowerCase();
                  return (
                    <div key={pinnedColor} className="relative group flex items-center justify-center">
                      <button
                        onClick={() => onSelectColor(pinnedColor)}
                        title={`Pinned Color: ${pinnedColor}`}
                        style={{ backgroundColor: pinnedColor }}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          isSelected
                            ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900 border-white'
                            : 'border-white/20 hover:border-white/60'
                        }`}
                      />
                      {/* Hover unpin button */}
                      <button
                        onClick={(e) => handleUnpinColor(pinnedColor, e)}
                        title="Unpin this color"
                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
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
              onClick={(e) => {
                if (isPropertiesModalOpen && activeModalTab === 'color') {
                  setIsPropertiesModalOpen(false);
                } else {
                  openPropertiesModal('color', e.currentTarget);
                }
              }}
              title="Color Studio"
              className={`relative p-2 rounded-lg border transition-colors flex items-center justify-center ${
                isPropertiesModalOpen && activeModalTab === 'color'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'hover:bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span
                className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white/40"
                style={{ backgroundColor: color }}
              />
            </button>
          </div>

          {/* Undo / Redo / Clear */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClear}
              title="Clear Board"
              className="p-2 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-r border-white/10 pr-2">
            <button
              onClick={onZoomOut}
              title="Zoom Out"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={onResetZoom}
              title="Reset Zoom (Ctrl+0)"
              className="px-2 py-1 text-xs font-mono rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={onZoomIn}
              title="Zoom In"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={onFitToContent}
              title="Fit to Screen"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Scan className="w-4 h-4" />
            </button>
          </div>

          {/* Pin Toggle Control */}
          <div className="flex items-center pl-0.5">
            <button
              onClick={handleTogglePin}
              title={
                isPinned
                  ? 'Pinned: Always open'
                  : 'Auto-hide: Opens on hover'
              }
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
                isPinned
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {isPinned ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
              <span className="text-[11px] hidden sm:inline">{isPinned ? 'Pinned' : 'Auto'}</span>
            </button>
          </div>

          {/* Pop-up Undocked Board over tabs */}
          {onUndockBoard && (
            <div className="flex items-center pl-1 border-l border-white/10">
              <button
                onClick={onUndockBoard}
                title="Pop-up Floating Board (Ctrl+D)"
                className="p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] hidden sm:inline">Pop-up</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
