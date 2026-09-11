import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, Copy, X, Moon, Sun, Share2, GraduationCap, FileText, Settings, Plus, RotateCcw, RotateCw, Trash2, FolderOpen } from 'lucide-react';
import { BoardThemeType } from '../../types/whiteboard';
import { APP_ICON_BASE64 } from '../../assets/iconBase64';

interface TitleBarProps {
  boardTitle: string;
  batchName?: string;
  theme: BoardThemeType;
  onThemeToggle: () => void;
  onOpenShare?: () => void;
  onOpenBatchManager?: () => void;
  onOpenSettings?: () => void;
  onNewPage?: () => void;
  onOpenDrawer?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onClose?: () => Promise<void> | void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  boardTitle,
  batchName,
  theme,
  onThemeToggle,
  onOpenShare,
  onOpenBatchManager,
  onOpenSettings,
  onNewPage,
  onOpenDrawer,
  onUndo,
  onRedo,
  onClear,
  saveStatus,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'file' | 'edit' | 'view' | 'settings' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.smartBoardAPI?.isMaximized().then(setIsMaximized);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  const handleMinimize = () => {
    window.smartBoardAPI?.minimize();
  };

  const handleMaximize = async () => {
    window.smartBoardAPI?.maximize();
    const max = await window.smartBoardAPI?.isMaximized();
    setIsMaximized(max ?? false);
  };

  const handleClose = async () => {
    if (onClose) {
      await onClose();
    } else if (window.smartBoardAPI) {
      window.smartBoardAPI.close();
    } else {
      window.close();
    }
  };

  return (
    <header className="h-9 w-full flex items-center justify-between pl-3 pr-0 select-none drag-region bg-slate-900 border-b border-slate-800 text-slate-200 z-50">
      {/* Brand & Menu Items */}
      <div className="flex items-center gap-2 no-drag" ref={menuRef}>
        {/* App Icon (No gradient, sleek solid brand icon) */}
        <div className="flex items-center gap-1.5 mr-1">
          <img src={APP_ICON_BASE64} alt="App Icon" className="w-5 h-5 rounded-md object-contain" />
        </div>

        {/* Menu 1: File */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeMenu === 'file' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="absolute left-0 top-full mt-1 w-52 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onNewPage?.();
                }}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-600/20 hover:text-blue-300 text-left text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Page</span>
                </div>
                <span className="text-[10px] opacity-50 font-mono">Ctrl+N</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenBatchManager?.();
                }}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-600/20 hover:text-blue-300 text-left text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Manage Batches</span>
                </div>
              </button>
              <div className="h-[1px] bg-slate-800 my-1" />
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenShare?.();
                }}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-600/20 hover:text-blue-300 text-left text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Export / Backup...</span>
                </div>
                <span className="text-[10px] opacity-50 font-mono">Ctrl+S</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 2: Edit */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeMenu === 'edit' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="absolute left-0 top-full mt-1 w-44 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onUndo?.();
                }}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-600/20 hover:text-blue-300 text-left text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </div>
                <span className="text-[10px] opacity-50 font-mono">Ctrl+Z</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onRedo?.();
                }}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-600/20 hover:text-blue-300 text-left text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Redo</span>
                </div>
                <span className="text-[10px] opacity-50 font-mono">Ctrl+Y</span>
              </button>
              <div className="h-[1px] bg-slate-800 my-1" />
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onClear?.();
                }}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-600/20 text-red-400 text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Page</span>
              </button>
            </div>
          )}
        </div>

        {/* Menu 3: View */}
        <div className="relative">
          <button
            onClick={() => setActiveMenu(activeMenu === 'view' ? null : 'view')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              activeMenu === 'view' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl py-1 z-50 text-xs">
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenDrawer?.();
                }}
                className="w-full px-3 py-2 flex items-center gap-2 hover:bg-blue-600/20 hover:text-blue-300 text-left text-slate-200"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Pages Drawer</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onThemeToggle();
                }}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-blue-600/20 hover:text-blue-300 text-left text-slate-200"
              >
                <div className="flex items-center gap-2">
                  {theme === 'whiteboard' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  <span>Toggle Dark / Light</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Menu 4: Settings */}
        <div className="relative">
          <button
            onClick={() => {
              setActiveMenu(null);
              onOpenSettings?.();
            }}
            className="px-2.5 py-1 rounded text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Settings</span>
          </button>
        </div>

        {/* Batch & Page Indicator */}
        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800 text-xs">
          {batchName && (
            <button
              onClick={onOpenBatchManager}
              title="Switch / Manage Batches"
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium max-w-[150px] truncate transition-colors"
            >
              <GraduationCap className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="truncate">{batchName}</span>
            </button>
          )}
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 font-medium max-w-[160px] truncate">
            {boardTitle}
          </span>
        </div>
      </div>

      {/* Center Status: Autosave Indicator */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span
          className={`w-2 h-2 rounded-full ${
            saveStatus === 'saved'
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
              : saveStatus === 'saving'
              ? 'bg-amber-400 animate-pulse'
              : 'bg-slate-500'
          }`}
        />
        <span className="text-[11px]">
          {saveStatus === 'saved'
            ? 'All changes saved locally'
            : saveStatus === 'saving'
            ? 'Saving...'
            : 'Local changes pending'}
        </span>
      </div>

      {/* Right Actions & Windows Caption Controls */}
      <div className="flex items-center h-full no-drag">
        {/* Share / Export Trigger */}
        {onOpenShare && (
          <button
            onClick={onOpenShare}
            title="Export / Share Page or Full Board (Ctrl+E)"
            className="h-full px-2.5 hover:bg-blue-600/20 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Theme Toggle Quick Switch */}
        <button
          onClick={onThemeToggle}
          title={`Switch Theme (Current: ${theme})`}
          className="h-full px-2.5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          {theme === 'whiteboard' ? (
            <Moon className="w-3.5 h-3.5" />
          ) : (
            <Sun className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Windows Caption Controls (Minimize, Maximize/Restore, Close) */}
        <div className="flex items-center h-full">
          <button
            onClick={handleMinimize}
            className="h-full w-11 flex items-center justify-center hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="h-full w-11 flex items-center justify-center hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Copy className="w-3 h-3 rotate-180" />
            ) : (
              <Square className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="h-full w-11 flex items-center justify-center hover:bg-red-600 text-slate-300 hover:text-white transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
