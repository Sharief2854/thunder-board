import { useEffect } from 'react';
import { WhiteboardPage, StrokeTool } from '../types/whiteboard';

interface UseKeyboardShortcutsOptions {
  handleUndo: () => void;
  handleRedo: () => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
  handleFitToContent: () => void;
  pages: WhiteboardPage[];
  activePageId: string;
  handleSelectPage: (pageId: string) => void;
  handleOpenShareBatch: () => void;
  handleManualSave: () => void;
  handleToggleFloatingBoard: () => void;
  handleCollapseToEdge: () => void;
  isFloatingBoard: boolean;
  setTool: (tool: StrokeTool) => void;
  handleToggleCodeHighlight: () => void;
  setIsTextBoxTypeModalOpen: (open: boolean) => void;
}

export function useKeyboardShortcuts({
  handleUndo,
  handleRedo,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
  handleFitToContent,
  pages,
  activePageId,
  handleSelectPage,
  handleOpenShareBatch,
  handleManualSave,
  handleToggleFloatingBoard,
  handleCollapseToEdge,
  isFloatingBoard,
  setTool,
  handleToggleCodeHighlight,
  setIsTextBoxTypeModalOpen,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if (
        (isCmdOrCtrl && e.key.toLowerCase() === 'd') ||
        (e.altKey && e.key.toLowerCase() === 'd')
      ) {
        handleToggleFloatingBoard();
        e.preventDefault();
      } else if (isFloatingBoard && e.key === 'Escape') {
        handleToggleFloatingBoard();
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if (
        (e.altKey && e.key.toLowerCase() === 'e') ||
        (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'e')
      ) {
        handleCollapseToEdge();
        e.preventDefault();
      } else if (isFloatingBoard && isCmdOrCtrl && e.key.toLowerCase() === 'e') {
        handleCollapseToEdge();
        e.preventDefault();
      } else if (isFloatingBoard && isCmdOrCtrl && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        handleCollapseToEdge();
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'e') {
        handleOpenShareBatch();
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        handleManualSave();
        e.preventDefault();
      } else if (isCmdOrCtrl && (e.key === '=' || e.key === '+')) {
        handleZoomIn();
        e.preventDefault();
      } else if (isCmdOrCtrl && (e.key === '-' || e.key === '_')) {
        handleZoomOut();
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key === '0') {
        handleResetZoom();
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key === '9') {
        handleFitToContent();
        e.preventDefault();
      } else if (e.key === 'PageUp' || (isCmdOrCtrl && e.key === '[')) {
        const idx = pages.findIndex(p => p.id === activePageId);
        if (idx > 0) handleSelectPage(pages[idx - 1].id);
        e.preventDefault();
      } else if (e.key === 'PageDown' || (isCmdOrCtrl && e.key === ']')) {
        const idx = pages.findIndex(p => p.id === activePageId);
        if (idx < pages.length - 1) handleSelectPage(pages[idx + 1].id);
        e.preventDefault();
      } else if (!isCmdOrCtrl && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        if (e.key.toLowerCase() === 'p') setTool('pen');
        if (e.key.toLowerCase() === 'e') setTool('stroke-eraser');
        if (e.key.toLowerCase() === 'h') setTool('pan');
        if (e.key.toLowerCase() === 'c') handleToggleCodeHighlight();
        if (e.key.toLowerCase() === 't') setIsTextBoxTypeModalOpen(true);
        if (e.key.toLowerCase() === 's') setTool('shape');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToContent,
    pages,
    activePageId,
    handleSelectPage,
    handleOpenShareBatch,
    handleManualSave,
    handleToggleFloatingBoard,
    handleCollapseToEdge,
    isFloatingBoard,
    setTool,
    handleToggleCodeHighlight,
    setIsTextBoxTypeModalOpen,
  ]);
}
