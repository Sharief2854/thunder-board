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
  Sparkles,
  Printer,
  FileText,
  Layers,
  Info,
} from 'lucide-react';
import { BoardThemeType, Stroke, TextBoxElement, WhiteboardDocument, WhiteboardPage } from '../../types/whiteboard';
import { ExportManager } from '../../core/export/ExportManager';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: WhiteboardDocument;
  activePage: WhiteboardPage;
  strokes: Record<string, Stroke>;
  textElements?: Record<string, TextBoxElement>;
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
  theme,
  onImportDocument,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'vector' | 'print' | 'backup'>('students');
  const [exportScope, setExportScope] = useState<'batch' | 'page'>('batch');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const effectiveTextElements = textElements || whiteboardDoc.textElements || {};

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
    const success = await ExportManager.copyPageToClipboard(activePage, strokes, theme, effectiveTextElements);
    if (success) {
      setCopied(true);
      showFeedback('High-resolution page copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSave4kPng = () => {
    const success = ExportManager.savePageAsPng(activePage, strokes, theme, effectiveTextElements);
    if (success) {
      showFeedback(`Saved 4K PNG: "${activePage.title}"`);
    }
  };

  const handleSaveSvg = () => {
    const success = ExportManager.savePageAsSvg(activePage, strokes, theme, effectiveTextElements);
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
      effectiveTextElements
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
        className={`relative z-10 w-full max-w-xl rounded-2xl shadow-2xl border overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900/95 border-white/15 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.7)]'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-[0_20px_60px_rgba(0,0,0,0.15)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-current/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight">Share & Export Lecture Notes</h2>
              <p className="text-[11px] opacity-60">
                {whiteboardDoc.title} • {whiteboardDoc.pages.length} Pages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMessage && (
          <div className="px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Scope Selector: Entire Batch vs Current Page */}
        <div className="px-6 pt-3 pb-1 flex items-center justify-between gap-2 border-b border-current/10 bg-black/5 dark:bg-white/5">
          <span className="text-[11px] font-semibold opacity-70 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Scope:</span>
          </span>

          <div className="flex p-0.5 rounded-xl bg-black/10 dark:bg-white/10 text-xs font-medium">
            <button
              onClick={() => setExportScope('batch')}
              className={`px-3 py-1 rounded-lg transition-all ${
                exportScope === 'batch'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              All Pages ({whiteboardDoc.pages.length})
            </button>
            <button
              onClick={() => setExportScope('page')}
              className={`px-3 py-1 rounded-lg transition-all truncate max-w-[200px] ${
                exportScope === 'page'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'opacity-70 hover:opacity-100'
              }`}
              title={activePage.title}
            >
              Current Page ({activePage.title})
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-current/10 px-6 pt-2 gap-2 text-xs font-semibold overflow-x-auto">
          {/* TAB 1: Student Web App */}
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'students'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Web Notes (.html)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
              BEST FOR STUDENTS
            </span>
          </button>

          {/* TAB 2: Vector SVG & 4K PNG */}
          <button
            onClick={() => setActiveTab('vector')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'vector'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <FileImage className="w-3.5 h-3.5" />
            <span>Vector SVG & 4K Image</span>
          </button>

          {/* TAB 3: Print / PDF */}
          <button
            onClick={() => setActiveTab('print')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'print'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          {/* TAB 4: Raw Backup & Restore */}
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'backup'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <FileArchive className="w-3.5 h-3.5" />
            <span>Editable Backup (.sblesson)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* TAB 1: WEB VIEWER (.HTML) */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-blue-400">
                  <Sparkles className="w-4 h-4" />
                  <span>Interactive Student Experience (Zero Apps Needed):</span>
                </div>
                <p className="opacity-80 leading-relaxed text-[11px]">
                  Generates a single self-contained <code className="text-blue-300 font-mono">.html</code> file. Students can open it in <strong>Chrome, Edge, Safari, or on mobile devices</strong>. Includes a <strong>left topic navigation sidebar</strong>, <strong>infinite zoom</strong>, <strong>dark/light toggle</strong>, and a <strong>1-click Print to PDF button</strong>.
                </p>
              </div>

              {/* Main Export Action */}
              <button
                onClick={handleExportHtmlViewer}
                disabled={isExporting}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-between transition-all shadow-md shadow-blue-900/30 border border-blue-500/30"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4" />
                  <span>
                    Export {exportScope === 'batch' ? 'All Pages' : 'Current Page'} as Interactive HTML
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] uppercase font-mono">
                  {isExporting ? 'Exporting...' : 'Universal File'}
                </span>
              </button>

              {/* Quick Copy to Clipboard for Slack/WhatsApp */}
              <button
                onClick={handleCopyImage}
                className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-between transition-all border ${
                  copied
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                    : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border-current/15'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied Full-Res Image!' : 'Copy Current Page to Clipboard'}</span>
                </div>
                <span className="text-[10px] opacity-70 font-mono">
                  {copied ? 'Ready to Paste' : 'WhatsApp / Slack'}
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: VECTOR SVG & 4K PNG */}
          {activeTab === 'vector' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs opacity-70 pb-1">
                <span>
                  Target Page: <strong className="text-blue-400">{activePage.title}</strong>
                </span>
                <span className="font-mono">{currentStrokesCount} strokes</span>
              </div>

              {/* Vector SVG */}
              <button
                onClick={handleSaveSvg}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-between transition-all shadow-md border border-emerald-500/30"
              >
                <div className="flex items-center gap-2.5">
                  <Code className="w-4 h-4" />
                  <span>Download Vector SVG (.svg)</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-mono opacity-80">
                  Infinite Zoom (0% Blur)
                </span>
              </button>

              {/* 4K Ultra-HD PNG */}
              <button
                onClick={handleSave4kPng}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-between transition-all border border-current/15 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Download 4K Ultra-HD PNG (3840 × 2160)</span>
                </div>
                <span className="text-[10px] opacity-60 uppercase font-mono">Crisp 4K</span>
              </button>
            </div>
          )}

          {/* TAB 3: PRINT / PDF */}
          {activeTab === 'print' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-indigo-400">
                  <FileText className="w-4 h-4" />
                  <span>Print & Save as High-Definition PDF:</span>
                </div>
                <p className="opacity-80 text-[11px] leading-relaxed">
                  Opens your system print dialog. In the destination dropdown, select <strong>"Save as PDF"</strong> to create a crisp, printable PDF document of your whiteboard notes.
                </p>
              </div>

              <button
                onClick={handlePrint}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-between transition-all shadow-lg shadow-blue-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4" />
                  <span>Open Print Dialog / Save as PDF</span>
                </div>
                <span className="text-[10px] opacity-80 uppercase font-mono">System Print</span>
              </button>
            </div>
          )}

          {/* TAB 4: EDITABLE BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-current/10 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-blue-400">
                  <Info className="w-4 h-4" />
                  <span>Editable ThunderBoard Format (.thunderboard):</span>
                </div>
                <p className="opacity-80 text-[11px] leading-relaxed">
                  This file is an <strong>editable raw backup</strong>. Use this when transferring your lectures to another trainer or restoring your notes on a new computer.
                </p>
              </div>

              {/* Export Backup */}
              <button
                onClick={handleExportLesson}
                disabled={isExporting}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-between transition-all shadow-md border border-blue-500/30"
              >
                <div className="flex items-center gap-2.5">
                  <FileArchive className="w-4 h-4" />
                  <span>Export Editable Lesson Backup (.thunderboard)</span>
                </div>
                <span className="text-[10px] opacity-80 uppercase font-mono">Full Backup</span>
              </button>

              {/* Import Backup */}
              <button
                onClick={handleImport}
                className="w-full py-3.5 px-4 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border-2 border-dashed border-blue-500/40 text-blue-400 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Import & Restore Lesson File (.thunderboard / .chalkbyte / .json)</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-current/10 bg-black/5 dark:bg-white/5 text-[11px] opacity-60 flex items-center justify-between">
          <span>100% Offline • Zero Quality Loss</span>
          <span className="font-mono">Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};
