import React from 'react';
import { X, Sliders, Palette } from 'lucide-react';
import { StrokeTool } from '../../types/whiteboard';
import { VsCodeColorPicker } from './VsCodeColorPicker';

export const QUICK_WIDTH_PRESETS = [
  { label: '1px', value: 1, desc: 'Ultra Fine' },
  { label: '2px', value: 2, desc: 'Fine' },
  { label: '4px', value: 4, desc: 'Regular' },
  { label: '7px', value: 7, desc: 'Medium' },
  { label: '12px', value: 12, desc: 'Bold' },
  { label: '20px', value: 20, desc: 'Thick' },
  { label: '32px', value: 32, desc: 'Broad' },
];

interface ToolbarPropertiesModalProps {
  popoverRef: React.RefObject<HTMLDivElement>;
  modalPos: { left: number; caretOffset: number };
  isTopPositioned: boolean;
  activeModalTab: 'size' | 'color';
  setActiveModalTab: (tab: 'size' | 'color') => void;
  width: number;
  onSelectWidth: (width: number) => void;
  color: string;
  onSelectColor: (color: string) => void;
  tool: StrokeTool;
  pinnedColors: string[];
  onTogglePinColor: (color: string) => void;
  onUnpinColor: (color: string, e: React.MouseEvent) => void;
  onClearPinnedColors: () => void;
  maxPinnedColors: number;
  isDark?: boolean;
  onClose: () => void;
  toolDisplayName: string;
}

export const ToolbarPropertiesModal: React.FC<ToolbarPropertiesModalProps> = ({
  popoverRef,
  modalPos,
  isTopPositioned,
  activeModalTab,
  setActiveModalTab,
  width,
  onSelectWidth,
  color,
  onSelectColor,
  tool,
  pinnedColors,
  onTogglePinColor,
  onUnpinColor,
  onClearPinnedColors,
  maxPinnedColors,
  isDark = true,
  onClose,
  toolDisplayName,
}) => {
  return (
    <div
      ref={popoverRef}
      style={{ left: `${modalPos.left}px` }}
      className={`absolute z-50 w-[330px] p-3.5 rounded-xl shadow-2xl border border-white/10 bg-slate-900 text-slate-100 select-none animate-in fade-in duration-150 ${
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

      {/* Segmented Tab Header: Thickness vs Color */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
        <div className="flex items-center p-0.5 rounded-lg bg-slate-800/80 border border-white/5">
          <button
            onClick={() => setActiveModalTab('size')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeModalTab === 'size'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Thickness ({width}px)</span>
          </button>
          <button
            onClick={() => setActiveModalTab('color')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeModalTab === 'color'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Color</span>
            <span
              className="w-2.5 h-2.5 rounded-full border border-white/30 ml-0.5"
              style={{ backgroundColor: color }}
            />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          title="Close"
          aria-label="Close properties"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* TAB 1: BRUSH & PEN THICKNESS */}
      {activeModalTab === 'size' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="text-slate-300 font-medium">{toolDisplayName} Preview:</span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">
              {width}px
            </span>
          </div>

          {/* Real-Time Brush Size & Color Preview Circle */}
          <div className="h-14 rounded-lg flex items-center justify-center border bg-slate-950/60 border-white/5">
            <div
              style={{
                width: `${Math.min(44, Math.max(2, width))}px`,
                height: `${Math.min(44, Math.max(2, width))}px`,
                backgroundColor: color,
                opacity: tool === 'highlighter' ? 0.4 : 1,
              }}
              className="rounded-full shadow-inner transition-all"
            />
          </div>

          {/* Interactive Range Slider (1px - 40px) */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1px</span>
              <span className="text-blue-400 font-medium">{width}px</span>
              <span>40px</span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={width}
              onChange={e => onSelectWidth(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Quick Preset Pills */}
          <div className="grid grid-cols-4 gap-1.5 pt-0.5">
            {QUICK_WIDTH_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => onSelectWidth(preset.value)}
                className={`py-1.5 px-1 rounded-md text-[11px] font-medium transition-colors text-center ${
                  width === preset.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title={preset.desc}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: VS CODE-STYLE COLOR STUDIO & PALETTE */}
      {activeModalTab === 'color' && (
        <VsCodeColorPicker
          color={color}
          onChangeColor={onSelectColor}
          pinnedColors={pinnedColors}
          onTogglePinColor={onTogglePinColor}
          onUnpinColor={onUnpinColor}
          onClearPinnedColors={onClearPinnedColors}
          isDark={isDark}
          maxPinnedColors={maxPinnedColors}
        />
      )}
    </div>
  );
};
