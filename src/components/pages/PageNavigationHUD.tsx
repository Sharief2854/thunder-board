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
      className={`fixed top-11 left-3 z-30 flex items-center gap-1 px-2 py-1 rounded-lg border shadow-md transition-colors select-none ${
        isDark
          ? 'bg-slate-900/95 border-white/10 text-slate-200'
          : 'bg-white/95 border-slate-200 text-slate-800'
      }`}
    >
      {/* Pages Drawer Toggle */}
      <button
        onClick={onOpenDrawer}
        title="Open Page Drawer & Manager"
        className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5 text-xs font-medium"
      >
        <Layers className="w-3.5 h-3.5 text-slate-400" />
        <span className="hidden sm:inline">Pages</span>
      </button>

      <span className="w-px h-3.5 bg-white/10 mx-0.5" />

      {/* Previous Page */}
      <button
        onClick={handlePrev}
        disabled={!hasPrev}
        title="Previous Page (PageUp / Ctrl+[)"
        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Page Title & Counter */}
      <button
        onClick={onOpenDrawer}
        title="Click to manage pages"
        className="px-1.5 py-0.5 rounded text-xs font-medium hover:bg-white/5 text-slate-300 flex items-center gap-1.5 max-w-[180px] truncate"
      >
        <span className="font-mono text-slate-400 text-[11px]">
          {currentIndex + 1}/{pages.length}
        </span>
        <span className="truncate">{activePage?.title || 'Untitled Page'}</span>
      </button>

      {/* Next Page */}
      <button
        onClick={handleNext}
        disabled={!hasNext}
        title="Next Page (PageDown / Ctrl+])"
        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      <span className="w-px h-3.5 bg-white/10 mx-0.5" />

      {/* Quick Add Page Button */}
      <button
        onClick={onAddPage}
        title="Add New Blank Page"
        className="p-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
