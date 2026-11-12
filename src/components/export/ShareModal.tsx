import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Download,
  FileArchive,
  Upload,
  Check,
  FileImage,
  Globe,
  Code,
  Printer,
  FileText,
  Layers,
  Info,
} from 'lucide-react';
import { BoardThemeType, Stroke, TextBoxElement, ImageElement, WhiteboardDocument, WhiteboardPage } from '../../types/whiteboard';
import { ExportManager } from '../../core/export/ExportManager';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: WhiteboardDocument;
  activePage: WhiteboardPage;
  strokes: Record<string, Stroke>;
  textElements?: Record<string, TextBoxElement>;
  imageElements?: Record<string, ImageElement>;
  theme: BoardThemeType;
  onImportDocument: (doc: WhiteboardDocument) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  document: whiteboardDoc,
  activePage,
  strokes,
  textElements,
  imageElements,
  theme,
  onImportDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'vector' | 'print' | 'backup'>('students');
  const [exportScope, setExportScope] = useState<'batch' | 'page'>('batch');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const effectiveTextElements = textElements || whiteboardDoc.textElements || {};
  const effectiveImageElements = imageElements || whiteboardDoc.imageElements || {};

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleCopyImage = async () => {
    const success = await ExportManager.copyPageToClipboard(activePage, strokes, theme, effectiveTextElements, effectiveImageElements);
    if (success) {
      setCopied(true);
      showFeedback('High-resolution page copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSave4kPng = async () => {
    const success = await ExportManager.savePageAsPng(activePage, strokes, theme, effectiveTextElements, effectiveImageElements);
    if (success) {
      showFeedback(`Saved 4K PNG: "${activePage.title}"`);
    }
  };

  const handleSaveSvg = () => {
    const success = ExportManager.savePageAsSvg(activePage, strokes, theme, effectiveTextElements, effectiveImageElements);
    if (success) {
      showFeedback(`Saved Vector SVG: "${activePage.title}"`);
    }
  };

  const handleExportHtmlViewer = async () => {
    setIsExporting(true);
    const pagesToExport = exportScope === 'page' ? [activePage] : whiteboardDoc.pages;
    const titleToExport =
      exportScope === 'page'
        ? `${whiteboardDoc.title} — ${activePage.title}`
        : whiteboardDoc.title;

    const success = await ExportManager.exportInteractiveHtmlViewer(
      titleToExport,
      exportScope === 'page' ? activePage.title : 'Lecture Notes',
      pagesToExport,
      strokes,
      theme,
      effectiveTextElements,
      effectiveImageElements
    );

    setIsExporting(false);
    if (success) {
      showFeedback('Interactive Student HTML notes exported successfully!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportLesson = async () => {
    setIsExporting(true);
    const success = await ExportManager.exportLessonPackage(whiteboardDoc);
    setIsExporting(false);
    if (success) {
      showFeedback('ThunderBoard Lesson (.thunderboard) exported successfully!');
    }
  };

  const handleImport = async () => {
    const imported = await ExportManager.importLessonPackage();
    if (imported) {
      onImportDocument(imported);
      onClose();
    }
  };

  const currentStrokesCount = Object.values(strokes).filter(
    s => s.pageId === activePage.id && !s.isErased
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-sm" />

      {/* Modal Card */}
      <div
        className={`relative z-10 w-full max-w-xl rounded-xl shadow-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900 border-white/10 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-sm tracking-tight">Share & Export Lecture Notes</h2>
              <p className="text-xs text-slate-400">
                {whiteboardDoc.title} • {whiteboardDoc.pages.length} Pages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Scope Selector */}
        <div className="px-6 py-3 flex items-center justify-between gap-2 border-b border-white/5 bg-slate-950/40">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Scope:</span>
          </span>

          <div className="flex p-0.5 rounded-lg bg-slate-800/80 border border-white/5 text-xs">
            <button
              onClick={() => setExportScope('batch')}
              className={`px-3 py-1 rounded-md transition-colors ${
                exportScope === 'batch'
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Pages ({whiteboardDoc.pages.length})
            </button>
            <button
              onClick={() => setExportScope('page')}
              className={`px-3 py-1 rounded-md transition-colors truncate max-w-[200px] ${
                exportScope === 'page'
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={activePage.title}
            >
              Current Page
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 px-6 gap-2 text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('students')}
            className={`py-3 px-2 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'students'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Web Notes (.html)</span>
          </button>

          <button
            onClick={() => setActiveTab('vector')}
            className={`py-3 px-2 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'vector'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileImage className="w-4 h-4" />
            <span>Vector & Image</span>
          </button>

          <button
            onClick={() => setActiveTab('print')}
            className={`py-3 px-2 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'print'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-2 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'backup'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            <span>Backup (.thunderboard)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: WEB VIEWER (.HTML) */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-800/60 border border-white/5 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-medium text-blue-400">
                  <Globe className="w-4 h-4" />
                  <span>Interactive HTML Document</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Generates a self-contained <code className="text-blue-300 font-mono">.html</code> file viewable in any modern browser. Supports sidebar navigation, zooming, theme toggling, and PDF export without needing any third-party app.
                </p>
              </div>

              <button
                onClick={handleExportHtmlViewer}
                disabled={isExporting}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs flex items-center justify-between transition-colors shadow-sm disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>
                    Export {exportScope === 'batch' ? 'All Pages' : 'Current Page'} as Interactive HTML
                  </span>
                </div>
                <span className="text-[11px] opacity-80 font-mono">
                  {isExporting ? 'Exporting...' : 'HTML'}
                </span>
              </button>

              <button
                onClick={handleCopyImage}
                className={`w-full py-3 px-4 rounded-lg font-medium text-xs flex items-center justify-between transition-colors border ${
                  copied
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Page Copied to Clipboard!' : 'Copy Page to Clipboard'}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {copied ? 'Ready' : 'Image'}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: VECTOR SVG & 4K PNG */}
          {activeTab === 'vector' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                <span>
                  Target Page: <strong className="text-slate-200">{activePage.title}</strong>
                </span>
                <span className="font-mono">{currentStrokesCount} strokes</span>
              </div>

              <button
                onClick={handleSaveSvg}
                className="w-full py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-white font-medium text-xs flex items-center justify-between transition-colors border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  <span>Download Vector SVG (.svg)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Vector</span>
              </button>

              <button
                onClick={handleSave4kPng}
                className="w-full py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-white font-medium text-xs flex items-center justify-between transition-colors border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Download 4K PNG (3840 × 2160)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">3840 × 2160</span>
              </button>
            </div>
          )}

          {/* TAB 3: PRINT / PDF */}
          {activeTab === 'print' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-lg bg-slate-800/60 border border-white/5 text-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-indigo-400">
                  <FileText className="w-4 h-4" />
                  <span>Print & PDF Export</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Opens the native print dialog. Select <strong>"Save as PDF"</strong> to export clean, printable lecture notes.
                </p>
              </div>

              <button
                onClick={handlePrint}
                className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs flex items-center justify-between transition-colors shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  <span>Open Print Dialog</span>
                </div>
                <span className="text-[11px] opacity-80 font-mono">System</span>
              </button>
            </div>
          )}

          {/* TAB 4: EDITABLE BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg bg-slate-800/60 border border-white/5 text-xs space-y-1">
                <div className="flex items-center gap-2 font-medium text-blue-400">
                  <Info className="w-4 h-4" />
                  <span>Document Backup & Migration</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Export editable raw backups to transfer boards between devices or archive finished lectures.
                </p>
              </div>

              <button
                onClick={handleExportLesson}
                disabled={isExporting}
                className="w-full py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-white font-medium text-xs flex items-center justify-between transition-colors border border-white/10 disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <FileArchive className="w-4 h-4 text-blue-400" />
                  <span>Export Document Backup (.thunderboard)</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Archive</span>
              </button>

              <button
                onClick={handleImport}
                className="w-full py-3 px-4 rounded-lg bg-transparent hover:bg-white/5 border border-dashed border-white/20 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-400" />
                <span>Import Backup (.thunderboard, .chalkbyte, .json)</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-slate-950/40 text-xs text-slate-500 flex items-center justify-between">
          <span>Offline processing</span>
          <span className="font-mono text-[11px]">Esc to close</span>
        </div>
      </div>
    </div>
  );
};
