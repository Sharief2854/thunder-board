import React from 'react';
import {
  X,
  Shapes,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Minus,
  Diamond,
  Star,
  Check,
} from 'lucide-react';
import { StrokeTool, ShapeType } from '../../types/whiteboard';

export const SHAPES_LIST: { id: ShapeType; name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'rectangle', name: 'Rectangle', icon: Square },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'triangle', name: 'Triangle', icon: Triangle },
  { id: 'arrow', name: 'Arrow', icon: ArrowRight },
  { id: 'line', name: 'Line', icon: Minus },
  { id: 'diamond', name: 'Diamond', icon: Diamond },
  { id: 'star', name: 'Star', icon: Star },
];

interface ToolbarShapesPopoverProps {
  popoverRef: React.RefObject<HTMLDivElement>;
  modalPos: { left: number; caretOffset: number };
  isTopPositioned: boolean;
  activeShapeType: ShapeType;
  tool: StrokeTool;
  isAutoSnapEnabled: boolean;
  onSelectShapeType?: (shape: ShapeType) => void;
  onSelectTool: (tool: StrokeTool) => void;
  onToggleAutoSnap?: () => void;
  onClose: () => void;
}

export const ToolbarShapesPopover: React.FC<ToolbarShapesPopoverProps> = ({
  popoverRef,
  modalPos,
  isTopPositioned,
  activeShapeType,
  tool,
  isAutoSnapEnabled,
  onSelectShapeType,
  onSelectTool,
  onToggleAutoSnap,
  onClose,
}) => {
  return (
    <div
      ref={popoverRef}
      style={{ left: `${modalPos.left}px` }}
      className={`absolute z-50 w-[288px] p-3.5 rounded-xl shadow-2xl border border-white/10 bg-slate-900 text-slate-100 select-none animate-in fade-in duration-150 ${
        isTopPositioned ? 'top-full mt-3' : 'bottom-full mb-3'
      }`}
    >
      {/* Pointing Caret Indicator */}
      <div
        style={{ left: `${modalPos.caretOffset}px` }}
        className={`absolute w-3 h-3 rotate-45 transform -translate-x-1/2 pointer-events-none bg-slate-900 border-white/10 ${
          isTopPositioned
            ? '-top-1.5 border-l border-t'
            : '-bottom-1.5 border-r border-b'
        }`}
      />

      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2.5">
        <div className="flex items-center gap-2 font-medium text-xs text-slate-200">
          <Shapes className="w-3.5 h-3.5 text-blue-400" />
          <span>Geometric Shapes</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          aria-label="Close shapes popover"
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
                onClose();
              }}
              title={shape.name}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-colors text-center ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'border-white/5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <IconComp className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium leading-tight">{shape.name}</span>
            </button>
          );
        })}
      </div>

      {/* Auto-Snap Handwriting to Shapes Toggle */}
      {onToggleAutoSnap && (
        <div
          onClick={onToggleAutoSnap}
          className="flex items-center justify-between p-2 rounded-lg bg-slate-800/60 border border-white/5 cursor-pointer hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shapes className={`w-3.5 h-3.5 ${isAutoSnapEnabled ? 'text-blue-400' : 'text-slate-400'}`} />
            <div className="text-left">
              <div className="text-xs font-medium leading-tight text-slate-200">Auto-Snap Shapes</div>
              <div className="text-[10px] text-slate-400">Snap freehand strokes to geometric shapes</div>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors flex items-center gap-1 ${
              isAutoSnapEnabled
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            {isAutoSnapEnabled ? <Check className="w-3 h-3" /> : null}
            {isAutoSnapEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      )}
    </div>
  );
};
