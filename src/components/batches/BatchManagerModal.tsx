import React, { useState } from 'react';
import {
  X,
  Plus,
  GraduationCap,
  Share2,
  Trash2,
  Copy,
  Layers,
  Check,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { Batch, BoardThemeType } from '../../types/whiteboard';

interface BatchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  activeBatchId: string;
  onSelectBatch: (batchId: string) => void;
  onCreateBatch: (name: string, subject: string, saveLocation?: string) => void;
  onDeleteBatch: (batchId: string) => void;
  onDuplicateBatch: (batchId: string) => void;
  onExportBatch: (batch: Batch) => void;
  theme: BoardThemeType;
}

export const BatchManagerModal: React.FC<BatchManagerModalProps> = ({
  isOpen,
  onClose,
  batches,
  activeBatchId,
  onSelectBatch,
  onCreateBatch,
  onDeleteBatch,
  onDuplicateBatch,
  onExportBatch,
  theme,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchSubject, setNewBatchSubject] = useState('');
  const [newBatchLocation, setNewBatchLocation] = useState('');

  if (!isOpen) return null;

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  const handleBrowseLocation = async () => {
    if (window.smartBoardAPI?.selectDirectory) {
      const res = await window.smartBoardAPI.selectDirectory();
      if (!res.canceled && res.path) {
        setNewBatchLocation(res.path);
      }
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBatchName.trim()) {
      onCreateBatch(
        newBatchName.trim(),
        newBatchSubject.trim() || 'Programming',
        newBatchLocation.trim() || undefined
      );
      setNewBatchName('');
      setNewBatchSubject('');
      setNewBatchLocation('');
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900/95 border-white/15 text-slate-100 shadow-[0_16px_48px_rgba(0,0,0,0.6)]'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-[0_16px_48px_rgba(0,0,0,0.15)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-current/10">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <span>Batches & Classes Manager</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-300">
              {batches.length} {batches.length === 1 ? 'Batch' : 'Batches'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Create New Batch Trigger / Form */}
          {isCreating ? (
            <form
              onSubmit={handleCreateSubmit}
              className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-800/80 border-blue-500/40' : 'bg-blue-50/50 border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Teaching Batch</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="p-1 opacity-60 hover:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold opacity-80 mb-1">
                    Batch / Class Name *
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={newBatchName}
                    onChange={e => setNewBatchName(e.target.value)}
                    placeholder="e.g. Batch 2026 - Morning Web Dev"
                    className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isDark
                        ? 'bg-slate-900 border-white/20 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold opacity-80 mb-1">
                    Course Topic / Subject
                  </label>
                  <input
                    type="text"
                    value={newBatchSubject}
                    onChange={e => setNewBatchSubject(e.target.value)}
                    placeholder="e.g. React & TypeScript Mastery"
                    className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isDark
                        ? 'bg-slate-900 border-white/20 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold opacity-80">
                      Save Location / Folder *
                    </label>
                    <button
                      type="button"
                      onClick={handleBrowseLocation}
                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Browse Folder...</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newBatchLocation}
                      onChange={e => setNewBatchLocation(e.target.value)}
                      placeholder="e.g. D:\Teaching\Batches\Batch1 (or click Browse)"
                      className={`flex-1 px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono ${
                        isDark
                          ? 'bg-slate-900 border-white/20 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleBrowseLocation}
                      title="Choose Folder on your computer"
                      className="px-3 py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Browse</span>
                    </button>
                  </div>
                  <p className="text-[10px] opacity-60 mt-1">
                    Your batch notes will be continuously saved into this folder as an editable <code>.sblesson</code> package.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs font-semibold opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-blue-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Create Batch</span>
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Batch</span>
            </button>
          )}

          {/* Batches List */}
          <div className="space-y-2.5 pt-1">
            {batches.map(b => {
              const isActive = b.id === activeBatchId;
              const totalStrokes = Object.values(b.strokes || {}).filter(s => !s.isErased).length;

              return (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectBatch(b.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isActive
                      ? 'border-blue-500 bg-blue-500/10 shadow-md ring-1 ring-blue-500/30'
                      : 'border-current/10 hover:border-current/25 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-xs truncate">{b.name}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] opacity-70">
                      <span className="text-blue-400 font-medium truncate">{b.subject || 'General'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>{b.pages.length} {b.pages.length === 1 ? 'Page' : 'Pages'}</span>
                      </span>
                      <span>•</span>
                      <span>{totalStrokes} strokes</span>
                    </div>

                    {b.saveLocation && (
                      <div
                        className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-400/90 font-mono truncate max-w-[320px]"
                        title={`Folder: ${b.saveLocation}`}
                      >
                        <Folder className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{b.saveLocation}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions (Share, Duplicate, Delete) */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1.5"
                  >
                    {/* Share Batch Button */}
                    <button
                      onClick={() => onExportBatch(b)}
                      title={`Export / Share entire "${b.name}" batch`}
                      className="p-2 rounded-lg bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-xs font-semibold"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* Duplicate Batch */}
                    <button
                      onClick={() => onDuplicateBatch(b.id)}
                      title="Duplicate Batch"
                      className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Batch */}
                    <button
                      disabled={batches.length <= 1}
                      onClick={() => onDeleteBatch(b.id)}
                      title={batches.length <= 1 ? "Cannot delete the only batch" : "Delete Batch"}
                      className="p-2 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-slate-400 disabled:opacity-20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-current/10 bg-black/5 dark:bg-white/5 text-[11px] opacity-60 text-center">
          Batches and all pages saved automatically offline
        </div>
      </div>
    </div>
  );
};
