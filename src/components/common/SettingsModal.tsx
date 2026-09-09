import React from 'react';
import { X, Sliders, Navigation, Pin, Sparkles, Monitor } from 'lucide-react';
import { BoardThemeType } from '../../types/whiteboard';

export interface AppSettings {
  autoIconGeneration: boolean;
  showNavigation: boolean;
  pinPenToolbar: boolean;
  autoSnapShapes: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  theme: BoardThemeType;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  theme,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl border transition-all overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-slate-700/80 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200 text-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.15)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-current/10 bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-sm tracking-wide">Preferences & Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-4">
          {/* Setting 1: Navigation Minimap On/Off */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-current/10 bg-black/5 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">Canvas Navigation (Minimap)</div>
                <div className="text-[11px] opacity-60">Display floating minimap overview at bottom-right</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ showNavigation: !settings.showNavigation })}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                settings.showNavigation ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  settings.showNavigation ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Setting 2: Pin the Pen / Tool Tab On/Off */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-current/10 bg-black/5 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Pin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">Pin Pen & Tools Toolbar</div>
                <div className="text-[11px] opacity-60">Keep inking tools expanded without collapsing on hover</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ pinPenToolbar: !settings.pinPenToolbar })}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                settings.pinPenToolbar ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  settings.pinPenToolbar ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Setting 3: Auto Icon Generation On/Off */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-current/10 bg-black/5 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">Auto Icon Generation</div>
                <div className="text-[11px] opacity-60">Generate icons dynamically for custom workspaces</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoIconGeneration: !settings.autoIconGeneration })}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                settings.autoIconGeneration ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  settings.autoIconGeneration ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Setting 4: Auto-Snap Shapes On/Off */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-current/10 bg-black/5 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Monitor className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold">Auto-Snap Shapes</div>
                <div className="text-[11px] opacity-60">Snap rough hand-drawn circles and boxes into shapes</div>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ autoSnapShapes: !settings.autoSnapShapes })}
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                settings.autoSnapShapes ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  settings.autoSnapShapes ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-current/10 bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
