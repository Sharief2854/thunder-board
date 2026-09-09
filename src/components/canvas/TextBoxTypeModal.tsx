import React from 'react';
import { X, Code2, Type } from 'lucide-react';
import { BoardThemeType, TextElementMode } from '../../types/whiteboard';

interface TextBoxTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (mode: TextElementMode) => void;
  theme: BoardThemeType;
}

export const TextBoxTypeModal: React.FC<TextBoxTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectType,
  theme,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150 ${
          isDark
            ? 'bg-slate-900 border-white/15 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200 text-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.2)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">Add Text Box</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs opacity-70">
          What type of box would you like to place on the board?
        </p>

        {/* 2 Choice Cards */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Option 1: Normal Text Box */}
          <button
            onClick={() => onSelectType('text')}
            className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${
              isDark
                ? 'border-white/15 hover:border-blue-400 bg-white/5 hover:bg-blue-500/10'
                : 'border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold block">Normal Text</span>
              <span className="text-[10px] opacity-60">Notes & text</span>
            </div>
          </button>

          {/* Option 2: Code Text Box */}
          <button
            onClick={() => onSelectType('code')}
            className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-2 transition-all hover:scale-[1.02] active:scale-95 ${
              isDark
                ? 'border-purple-500/40 hover:border-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
                : 'border-purple-200 hover:border-purple-500 bg-purple-50/60 hover:bg-purple-100/60'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/25 text-purple-400 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold block text-purple-400">Code Box</span>
              <span className="text-[10px] opacity-60">Syntax colors</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
