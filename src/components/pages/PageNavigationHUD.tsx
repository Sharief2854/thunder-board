import React from 'react';
import { ChevronLeft, ChevronRight, Plus, Layers } from 'lucide-react';
import { BoardThemeType, WhiteboardPage } from '../../types/whiteboard';

interface PageNavigationHUDProps {
  pages: WhiteboardPage[];
  activePageId: string;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  onOpenDrawer: () => void;
  theme: BoardThemeType;
}

export const PageNavigationHUD: React.FC<PageNavigationHUDProps> = ({
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  onOpenDrawer,
  theme,
}) => {
  const isDark = theme === 'blackboard' || theme === 'chalkboard';
  const currentIndex = pages.findIndex(p => p.id === activePageId);
  const activePage = pages[currentIndex] || pages[0];

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < pages.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onSelectPage(pages[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectPage(pages[currentIndex + 1].id);
    }
  };

  return (
    <div
      className={`fixed top-12 left-4 z-30 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl shadow-xl backdrop-blur-xl border transition-all select-none ${
        isDark
          ? 'bg-slate-900/90 border-white/15 text-slate-200'
          : 'bg-white/90 border-slate-200/80 text-slate-800'
      }`}
    >
      {/* Pages Drawer Toggle */}
      <button
        onClick={onOpenDrawer}
        title="Open Page Drawer & Manager"
        className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
      >
        <Layers className="w-4 h-4" />
        <span className="hidden sm:inline">Pages</span>
      </button>

      <span className="w-px h-4 bg-current/15 mx-0.5" />

      {/* Previous Page */}
      <button
        onClick={handlePrev}
        disabled={!hasPrev}
        title="Previous Page (PageUp / Ctrl+[)"
        className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Title & Counter */}
      <button
        onClick={onOpenDrawer}
        title="Click to manage pages"
        className="px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 max-w-[180px] truncate"
      >
        <span className="font-mono text-blue-400">
          {currentIndex + 1}/{pages.length}
        </span>
        <span className="truncate">{activePage?.title || 'Untitled Page'}</span>
      </button>

      {/* Next Page */}
      <button
        onClick={handleNext}
        disabled={!hasNext}
        title="Next Page (PageDown / Ctrl+])"
        className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <span className="w-px h-4 bg-current/15 mx-0.5" />

      {/* Quick Add Page Button */}
      <button
        onClick={onAddPage}
        title="Add New Blank Page"
        className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
