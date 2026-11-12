import React, { useState, useEffect, useRef } from 'react';
import { Minus, Square, Copy, X, Share2, GraduationCap, FileText, Settings, Plus, RotateCcw, RotateCw, Trash2, FolderOpen, ChevronDown, Check, Save, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { BoardThemeType, Batch } from '../../types/whiteboard';
import { APP_ICON_BASE64 } from '../../assets/iconBase64';

interface TitleBarProps {
  boardTitle: string;
  batchName?: string;
  batches?: Batch[];
  activeBatchId?: string;
  onSelectBatch?: (batchId: string) => void;
  onOpenBatchesDrawer?: () => void;
  theme?: BoardThemeType;
  onThemeToggle?: () => void;
  onOpenShare?: () => void;
  onOpenBatchManager?: () => void;
  onOpenSettings?: () => void;
  onNewPage?: () => void;
  onOpenDrawer?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onClear?: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  onSave?: () => void;
  onClose?: () => Promise<void> | void;
  onUndockBoard?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  boardTitle,
  batchName,
  batches,
  activeBatchId,
  onSelectBatch,
  onOpenBatchesDrawer,
  theme: _theme,
  onThemeToggle: _onThemeToggle,
  onOpenShare,
  onOpenBatchManager,
  onOpenSettings,
  onNewPage,
  onOpenDrawer,
  onUndo,
  onRedo,
  onClear,
  saveStatus,
  onSave,
  onClose,
  onUndockBoard,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'file' | 'edit' | 'view' | 'settings' | null>(null);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const batchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.smartBoardAPI?.isMaximized().then(setIsMaximized);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target as Node)) {
        setIsBatchDropdownOpen(false);
      }
    };
    if (activeMenu || isBatchDropdownOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu, isBatchDropdownOpen]);

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
        {/* App Icon */}
        <div className="flex items-center gap-1.5 mr-1">
          <img src={APP_ICON_BASE64} alt="App Icon" className="w-5 h-5 rounded object-contain" />
          <span className="font-semibold text-xs tracking-wide text-white hidden lg:inline-flex items-center gap-1.5">
            ThunderBoard
            <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/10 text-[10px] text-slate-300 font-mono font-medium">v4</span>
          </span>
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
              {onUndockBoard && (
                <button
                  onClick={() => {
                    setActiveMenu(null);
                    onUndockBoard();
                  }}
                  className="w-full px-3 py-2 flex items-center justify-between hover:bg-purple-600/20 hover:text-purple-300 text-left text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                    <span>Pop-up Floating Board</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Ctrl+D</span>
                </button>
              )}
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

        {/* Batches & Files Library Button */}
        {onOpenBatchesDrawer && (
          <button
            onClick={onOpenBatchesDrawer}
            title="Browse all batches, classes & saved files"
            className="px-2 py-0.5 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Batches & Files</span>
            {batches && batches.length > 0 && (
              <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-mono">
                {batches.length}
              </span>
            )}
          </button>
        )}

        {/* Batch & Page Indicator with Quick Dropdown */}
        <div className="flex items-center gap-2 ml-1 pl-2 border-l border-slate-800 text-xs" ref={batchDropdownRef}>
          <div className="relative">
            <button
              onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
              title="Click to switch batch or manage files"
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium max-w-[170px] transition-colors border border-slate-700/60"
            >
              <GraduationCap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{batchName || 'Select Batch'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isBatchDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-slate-400 font-semibold">
                  <span>Available Batches</span>
                  {onOpenBatchesDrawer && (
                    <button
                      onClick={() => {
                        setIsBatchDropdownOpen(false);
                        onOpenBatchesDrawer();
                      }}
                      className="text-blue-400 hover:text-blue-300 text-[11px] underline"
                    >
                      Library &rarr;
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                  {batches && batches.length > 0 ? (
                    batches.map((b) => {
                      const isActive = b.id === activeBatchId;
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            setIsBatchDropdownOpen(false);
                            onSelectBatch?.(b.id);
                          }}
                          className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800 transition-colors ${
                            isActive ? 'bg-blue-600/20 text-blue-300 font-medium' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                            <div className="truncate">
                              <div className="truncate font-medium">{b.name}</div>
                              {b.saveLocation && (
                                <div className="text-[10px] text-slate-500 truncate">{b.saveLocation}</div>
                              )}
                            </div>
                          </div>
                          {isActive && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-3 text-slate-500 text-center">No batches found</div>
                  )}
                </div>

                <div className="border-t border-slate-800 pt-1 mt-1 px-1">
                  <button
                    onClick={() => {
                      setIsBatchDropdownOpen(false);
                      if (onOpenBatchesDrawer) onOpenBatchesDrawer();
                      else if (onOpenBatchManager) onOpenBatchManager();
                    }}
                    className="w-full px-2.5 py-1.5 rounded flex items-center justify-center gap-1.5 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 transition-colors font-medium text-[11px]"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open Batches & Files Library</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <span className="text-slate-600">/</span>
          <span className="text-slate-300 font-medium max-w-[160px] truncate" title={boardTitle}>
            {boardTitle}
          </span>
        </div>
      </div>

      {/* Center Status: Save Status & Quick Save */}
      <div className="flex items-center gap-2 text-xs no-drag">
        <span className="hidden md:inline text-[11px] text-slate-400">
          by <span className="text-slate-300 font-medium">Sharief</span>
        </span>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-xs text-slate-400">
          {saveStatus === 'saved' ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          ) : saveStatus === 'saving' ? (
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
          )}
          <span className="text-[11px]">
            {saveStatus === 'saved'
              ? 'Saved'
              : saveStatus === 'saving'
              ? 'Saving...'
              : 'Autosave active'}
          </span>
        </div>

        {onSave && (
          <button
            onClick={onSave}
            title="Save board changes (Ctrl+S)"
            className="px-2 py-0.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 font-medium"
          >
            <Save className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Save</span>
          </button>
        )}
      </div>

      {/* Right Actions & Windows Caption Controls */}
      <div className="flex items-center h-full no-drag">
        {/* Share / Export Trigger */}
        {onOpenShare && (
          <button
            onClick={onOpenShare}
            title="Export / Share Page or Full Board (Ctrl+E)"
            className="h-full px-2.5 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        )}

        {/* Pop-up / Undock Board over other tabs */}
        {onUndockBoard && (
          <button
            onClick={onUndockBoard}
            title="Pop-up Floating Board over other tabs & apps (Ctrl+D)"
            className="h-full px-2.5 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Pop-up</span>
          </button>
        )}

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
