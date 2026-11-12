import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  GraduationCap,
  Share2,
  Trash2,
  Copy,
  Folder,
  FolderOpen,
  FileText,
  Search,
  ExternalLink,
  Clock,
  HardDrive,
  Upload,
  Layers,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Batch, BoardThemeType } from '../../types/whiteboard';

export interface LessonFileItem {
  name: string;
  path: string;
  size: number;
  updatedAt: number;
  ext: string;
  type: 'board' | 'html' | 'lesson';
}

interface BatchesAndFilesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Batch[];
  activeBatchId: string;
  onSelectBatch: (batchId: string) => void;
  onCreateBatch: (name: string, subject: string, saveLocation?: string) => void;
  onDeleteBatch: (batchId: string) => void;
  onDuplicateBatch: (batchId: string) => void;
  onExportBatch: (batch: Batch) => void;
  onImportFromFile: () => void;
  onLoadFileToBoard?: (filePath: string) => void;
  theme: BoardThemeType;
}

export const BatchesAndFilesDrawer: React.FC<BatchesAndFilesDrawerProps> = ({
  isOpen,
  onClose,
  batches,
  activeBatchId,
  onSelectBatch,
  onCreateBatch,
  onDeleteBatch,
  onDuplicateBatch,
  onExportBatch,
  onImportFromFile,
  onLoadFileToBoard,
  theme,
}) => {
  const [activeTab, setActiveTab] = useState<'batches' | 'files'>('batches');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchSubject, setNewBatchSubject] = useState('');
  const [newBatchLocation, setNewBatchLocation] = useState('');

  // Scanned Lesson Files from disk
  const [scannedFiles, setScannedFiles] = useState<LessonFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  const loadDiskFiles = useCallback(async () => {
    if (window.smartBoardAPI?.listAllLessonFiles) {
      setIsLoadingFiles(true);
      try {
        const res = await window.smartBoardAPI.listAllLessonFiles();
        if (res.success && res.files) {
          setScannedFiles(res.files);
        }
      } catch (err) {
        console.warn('Could not scan lesson files:', err);
      } finally {
        setIsLoadingFiles(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDiskFiles();
    }
  }, [isOpen, loadDiskFiles]);

  if (!isOpen) return null;

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
        newBatchSubject.trim() || 'General Topics',
        newBatchLocation.trim() || undefined
      );
      setNewBatchName('');
      setNewBatchSubject('');
      setNewBatchLocation('');
      setIsCreating(false);
    }
  };

  const handleOpenFolder = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.smartBoardAPI?.openPath) {
      window.smartBoardAPI.openPath(folderPath);
    }
  };

  const handleRevealFile = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.smartBoardAPI?.showItemInFolder) {
      window.smartBoardAPI.showItemInFolder(filePath);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredBatches = batches.filter(
    b =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.subject && b.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredFiles = scannedFiles.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Slide-over Library Panel */}
      <div
        className={`relative z-10 w-[540px] max-w-[95vw] h-full shadow-2xl flex flex-col border-l animate-in slide-in-from-right duration-250 ${
          isDark
            ? 'bg-slate-900 border-white/10 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-current/10 bg-black/5 dark:bg-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm flex items-center gap-2">
                  Batches & Files Library
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {batches.length} {batches.length === 1 ? 'Batch' : 'Batches'}
                  </span>
                </h2>
                <p className="text-[11px] opacity-60">
                  Switch batches, manage teaching classes, and access saved lesson files.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-black/10 dark:bg-white/10 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('batches')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'batches'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Batches & Classes ({batches.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'files'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Saved Lesson Files ({scannedFiles.length})</span>
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'batches' ? 'Search batches by name or subject...' : 'Search lesson files...'}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-black/10 dark:bg-white/10 border border-current/10 focus:outline-none focus:border-blue-500 font-medium"
              />
            </div>

            {activeTab === 'batches' ? (
              <button
                onClick={() => setIsCreating(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm shrink-0 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Batch</span>
              </button>
            ) : (
              <button
                onClick={onImportFromFile}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 shadow-sm shrink-0 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import File</span>
              </button>
            )}
          </div>
        </div>

        {/* Panel Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* TAB 1: BATCHES */}
          {activeTab === 'batches' && (
            <>
              {/* Create Batch Inline Form */}
              {isCreating && (
                <form
                  onSubmit={handleCreateSubmit}
                  className={`p-4 rounded-2xl border space-y-3 animate-in zoom-in-95 duration-150 ${
                    isDark ? 'bg-slate-800/90 border-blue-500/40 shadow-xl' : 'bg-blue-50/70 border-blue-300 shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create New Batch</span>
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
                        Batch Name *
                      </label>
                      <input
                        type="text"
                        autoFocus
                        required
                        value={newBatchName}
                        onChange={e => setNewBatchName(e.target.value)}
                        placeholder="e.g. Batch 2026 - Morning Web Dev"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-current/15 bg-black/10 dark:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold opacity-80 mb-1">
                        Subject / Course Topic
                      </label>
                      <input
                        type="text"
                        value={newBatchSubject}
                        onChange={e => setNewBatchSubject(e.target.value)}
                        placeholder="e.g. FullStack JavaScript & React"
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-current/15 bg-black/10 dark:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold opacity-80 mb-1">
                        Dedicated Folder (Auto-generates student notes)
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={newBatchLocation}
                          placeholder="Select folder to save notes..."
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-current/15 bg-black/10 dark:bg-white/10 truncate font-mono opacity-80"
                        />
                        <button
                          type="button"
                          onClick={handleBrowseLocation}
                          className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 border border-current/15 flex items-center gap-1 shrink-0"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Browse</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1.5 text-xs rounded-xl border border-current/15 opacity-70 hover:opacity-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newBatchName.trim()}
                      className="px-4 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-50"
                    >
                      Create Batch
                    </button>
                  </div>
                </form>
              )}

              {/* Batches Cards List */}
              {filteredBatches.length === 0 ? (
                <div className="text-center py-12 opacity-50 space-y-2">
                  <GraduationCap className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs">No batches match &quot;{searchQuery}&quot;</p>
                </div>
              ) : (
                filteredBatches.map(batch => {
                  const isActive = batch.id === activeBatchId;
                  const strokeCount = Object.values(batch.strokes || {}).filter(s => !s.isErased).length;
                  const pageCount = batch.pages?.length || 1;

                  return (
                    <div
                      key={batch.id}
                      onClick={() => {
                        onSelectBatch(batch.id);
                        onClose();
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer group relative ${
                        isActive
                          ? 'bg-blue-600/15 border-blue-500 shadow-md shadow-blue-500/10'
                          : 'bg-black/5 dark:bg-white/5 border-current/10 hover:border-current/25 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm truncate">{batch.name}</h3>
                            {isActive && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </span>
                            )}
                          </div>

                          <p className="text-xs opacity-70 truncate font-medium">
                            {batch.subject || 'General Topics'}
                          </p>

                          {/* Stats Badges */}
                          <div className="flex items-center gap-3 pt-1 text-[11px] opacity-60 font-mono">
                            <span>{pageCount} {pageCount === 1 ? 'Page' : 'Pages'}</span>
                            <span>•</span>
                            <span>{strokeCount} Strokes</span>
                            {batch.updatedAt && (
                              <>
                                <span>•</span>
                                <span className="truncate flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDate(batch.updatedAt)}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Custom Folder Path */}
                          {batch.saveLocation && (
                            <div className="pt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-400/90 truncate">
                              <Folder className="w-3 h-3 shrink-0" />
                              <span className="truncate">{batch.saveLocation}</span>
                              <button
                                onClick={e => handleOpenFolder(batch.saveLocation!, e)}
                                title="Open batch folder in Windows Explorer"
                                className="p-1 rounded hover:bg-amber-400/20 text-amber-300 shrink-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Batch Action Buttons */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              onSelectBatch(batch.id);
                              onClose();
                            }}
                            title="Open Batch"
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-colors ${
                              isActive
                                ? 'bg-blue-600 text-white'
                                : 'bg-black/10 dark:bg-white/10 hover:bg-blue-600 hover:text-white'
                            }`}
                          >
                            {isActive ? 'Current' : 'Switch'}
                          </button>

                          <button
                            onClick={() => onExportBatch(batch)}
                            title="Export notes & student HTML"
                            className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onDuplicateBatch(batch.id)}
                            title="Duplicate batch"
                            className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-60 hover:opacity-100"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {batches.length > 1 && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete batch "${batch.name}"?`)) {
                                  onDeleteBatch(batch.id);
                                }
                              }}
                              title="Delete batch"
                              className="p-1.5 rounded-xl hover:bg-red-500/20 text-red-400 opacity-60 hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* TAB 2: SAVED FILES & LESSONS */}
          {activeTab === 'files' && (
            <>
              {isLoadingFiles ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-slate-400" />
                  <p className="text-xs">Scanning lesson files on disk...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12 opacity-50 space-y-3">
                  <FileText className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs">No saved lesson files found yet.</p>
                  <button
                    onClick={onImportFromFile}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Open Any File from PC</span>
                  </button>
                </div>
              ) : (
                filteredFiles.map(file => (
                  <div
                    key={file.path}
                    className="p-3.5 rounded-2xl border border-current/10 bg-black/5 dark:bg-white/5 hover:border-current/25 hover:bg-black/10 dark:hover:bg-white/10 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-md text-white shrink-0 ${
                            file.type === 'lesson'
                              ? 'bg-blue-600'
                              : file.type === 'html'
                              ? 'bg-amber-600'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {file.ext.replace('.', '') || 'FILE'}
                        </span>
                        <h4 className="font-bold text-xs truncate">{file.name}</h4>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] opacity-60 font-mono">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{formatDate(file.updatedAt)}</span>
                      </div>

                      <p className="text-[10px] opacity-40 font-mono truncate">{file.path}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {file.type !== 'html' && onLoadFileToBoard && (
                        <button
                          onClick={() => {
                            onLoadFileToBoard(file.path);
                            onClose();
                          }}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
                        >
                          Load
                        </button>
                      )}

                      <button
                        onClick={e => handleRevealFile(file.path, e)}
                        title="Reveal file in Windows Explorer"
                        className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Panel Footer */}
        <div className="p-4 border-t border-current/10 bg-black/5 dark:bg-white/5 flex items-center justify-between">
          <div className="text-xs opacity-60 font-mono">
            {batches.length} {batches.length === 1 ? 'batch' : 'batches'} • {scannedFiles.length} files indexed
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
          >
            Close Library
          </button>
        </div>
      </div>
    </div>
  );
};
