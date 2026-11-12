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
        className={`w-full max-w-sm rounded-xl shadow-xl border p-5 flex flex-col gap-3.5 select-none ${
          isDark
            ? 'bg-slate-900 border-white/10 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Add Text Element</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Select the type of box to insert onto your canvas:
        </p>

        {/* 2 Choice Cards */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Option 1: Normal Text Box */}
          <button
            onClick={() => onSelectType('text')}
            className={`p-3.5 rounded-lg border flex flex-col items-center text-center gap-2 transition-colors ${
              isDark
                ? 'border-white/10 hover:border-blue-500 bg-slate-800/60 hover:bg-slate-800 text-slate-200'
                : 'border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 text-slate-800'
            }`}
          >
            <div className="w-9 h-9 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-medium block">Standard Text</span>
              <span className="text-[10px] text-slate-400">Notes & Headings</span>
            </div>
          </button>

          {/* Option 2: Code Text Box */}
          <button
            onClick={() => onSelectType('code')}
            className={`p-3.5 rounded-lg border flex flex-col items-center text-center gap-2 transition-colors ${
              isDark
                ? 'border-white/10 hover:border-purple-500 bg-slate-800/60 hover:bg-slate-800 text-slate-200'
                : 'border-slate-200 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/50 text-slate-800'
            }`}
          >
            <div className="w-9 h-9 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-medium block">Code Block</span>
              <span className="text-[10px] text-slate-400">Syntax Highlighted</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
