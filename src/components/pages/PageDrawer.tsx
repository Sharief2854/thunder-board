import React, { useState } from 'react';
import {
  X,
  Plus,
  Copy,
  Trash2,
  Edit2,
  Check,
  ArrowUp,
  ArrowDown,
  Layers,
  FileText,
  Share2,
  GraduationCap,
} from 'lucide-react';
import { Batch, BoardThemeType, Stroke, WhiteboardPage } from '../../types/whiteboard';

interface PageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch;
  pages: WhiteboardPage[];
  activePageId: string;
  strokes: Record<string, Stroke>;
  onSelectPage: (pageId: string) => void;
  onPromptAddPage: () => void;
  onRenamePage: (pageId: string, newTitle: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onDeletePage: (pageId: string) => void;
  onReorderPages: (startIndex: number, endIndex: number) => void;
  onSharePage: (page: WhiteboardPage) => void;
  onShareBatch: () => void;
  onOpenBatchManager: () => void;
  theme: BoardThemeType;
}

export const PageDrawer: React.FC<PageDrawerProps> = ({
  isOpen,
  onClose,
  batch,
  pages,
  activePageId,
  strokes,
  onSelectPage,
  onPromptAddPage,
  onRenamePage,
  onDuplicatePage,
  onDeletePage,
  onReorderPages,
  onSharePage,
  onShareBatch,
  onOpenBatchManager,
  theme,
}) => {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  if (!isOpen) return null;

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  const startRename = (page: WhiteboardPage, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(page.id);
    setEditTitle(page.title);
  };

  const saveRename = (pageId: string, e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitle.trim()) {
      onRenamePage(pageId, editTitle.trim());
    }
    setEditingPageId(null);
  };

  const getPageStrokeCount = (pageId: string) => {
    return Object.values(strokes).filter(s => s.pageId === pageId && !s.isErased).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <div
        className={`relative z-10 w-88 max-w-[90vw] h-full shadow-2xl flex flex-col border-r transition-transform ${
          isDark
            ? 'bg-slate-900/95 border-white/10 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-800'
        }`}
      >
        {/* Drawer Header: Active Batch Card */}
        <div className="p-4 border-b border-current/10 bg-black/5 dark:bg-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                Current Batch
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="font-bold text-sm truncate">{batch.name}</h3>
            <p className="text-[11px] opacity-70 truncate">{batch.subject || 'General Topics'}</p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                onOpenBatchManager();
                onClose();
              }}
              className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-black/10 dark:bg-white/10 hover:bg-blue-600/20 hover:text-blue-400 border border-current/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Switch Batch</span>
            </button>

            <button
              onClick={() => {
                onShareBatch();
                onClose();
              }}
              title="Share / Export all pages in this batch"
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-md shadow-blue-500/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Batch</span>
            </button>
          </div>
        </div>

        {/* Add Page Action */}
        <div className="p-3 border-b border-current/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Topics ({pages.length})</span>
          </div>

          <button
            onClick={() => {
              onPromptAddPage();
              onClose();
            }}
            className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Topic Page</span>
          </button>
        </div>

        {/* Page List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {pages.map((page, index) => {
            const isActive = page.id === activePageId;
            const strokeCount = getPageStrokeCount(page.id);

            return (
              <div
                key={page.id}
                onClick={() => {
                  onSelectPage(page.id);
                  onClose();
                }}
                className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'border-blue-500 bg-blue-500/10 shadow-md ring-1 ring-blue-500/30'
                    : 'border-current/10 hover:border-current/25 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {/* Title & Rename */}
                <div className="flex items-center justify-between mb-1.5">
                  {editingPageId === page.id ? (
                    <form
                      onSubmit={e => saveRename(page.id, e)}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 w-full"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => saveRename(page.id)}
                        className="flex-1 px-2 py-0.5 text-xs rounded bg-slate-800 text-white border border-blue-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="p-1 text-emerald-400 hover:bg-white/10 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-xs font-bold text-blue-400">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-semibold truncate">
                        {page.title}
                      </span>
                    </div>
                  )}

                  {editingPageId !== page.id && (
                    <button
                      onClick={e => startRename(page, e)}
                      title="Rename Topic"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-slate-400 hover:text-white transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Page Stats & Action Bar */}
                <div className="flex items-center justify-between text-[11px] opacity-70 pt-1.5 border-t border-current/10">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    <span>{strokeCount} {strokeCount === 1 ? 'stroke' : 'strokes'}</span>
                  </div>

                  {/* Actions (Share Page, Reorder, Duplicate, Delete) */}
                  <div
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1"
                  >
                    {/* Share this specific Page button */}
                    <button
                      onClick={() => {
                        onSharePage(page);
                        onClose();
                      }}
                      title="Share / Export this topic page"
                      className="p-1 px-1.5 rounded bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 flex items-center gap-1 text-[10px] font-semibold"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>

                    {/* Move Up */}
                    <button
                      disabled={index === 0}
                      onClick={() => onReorderPages(index, index - 1)}
                      title="Move Page Up"
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-20"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>

                    {/* Move Down */}
                    <button
                      disabled={index === pages.length - 1}
                      onClick={() => onReorderPages(index, index + 1)}
                      title="Move Page Down"
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded disabled:opacity-20"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>

                    {/* Duplicate Page */}
                    <button
                      onClick={() => onDuplicatePage(page.id)}
                      title="Duplicate Page"
                      className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded text-blue-400"
                    >
                      <Copy className="w-3 h-3" />
                    </button>

                    {/* Delete Page */}
                    <button
                      disabled={pages.length <= 1}
                      onClick={() => onDeletePage(page.id)}
                      title={pages.length <= 1 ? "Cannot delete the only page" : "Delete Page"}
                      className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-slate-400 disabled:opacity-20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-current/10 text-center text-[11px] opacity-60">
          ThunderBoard Offline Persistence Active
        </div>
      </div>
    </div>
  );
};
