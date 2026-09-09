import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Sparkles, BookOpen } from 'lucide-react';
import { BoardThemeType } from '../../types/whiteboard';

interface NewPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePage: (topicTitle: string) => void;
  pageNumber: number;
  theme: BoardThemeType;
}

const TOPIC_SUGGESTIONS = [
  'HTML5 Semantic Tags',
  'CSS Flexbox & Grid',
  'JavaScript ES6+ & Scope',
  'React Hooks & State',
  'Async / Await & Promises',
  'DOM Manipulation',
  'Interview Questions',
  'Live Coding Exercise',
];

export const NewPageModal: React.FC<NewPageModalProps> = ({
  isOpen,
  onClose,
  onCreatePage,
  pageNumber,
  theme,
}) => {
  const [topic, setTopic] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

  useEffect(() => {
    if (isOpen) {
      setTopic(`Page ${pageNumber}: Topic`);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, pageNumber]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = topic.trim() || `Page ${pageNumber}: Untitled Topic`;
    onCreatePage(finalTitle);
    onClose();
  };

  const handleSelectSuggestion = (sug: string) => {
    setTopic(`Page ${pageNumber}: ${sug}`);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal Box */}
      <div
        className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl border p-5 transition-all ${
          isDark
            ? 'bg-slate-900/95 border-white/15 text-slate-100 shadow-[0_16px_48px_rgba(0,0,0,0.6)]'
            : 'bg-white/95 border-slate-200 text-slate-800 shadow-[0_16px_48px_rgba(0,0,0,0.15)]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-current/10 mb-4">
          <div className="flex items-center gap-2 font-bold text-sm">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Create New Page</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-400">
              #{pageNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 opacity-80">
              What topic or concept will you teach on this page?
            </label>
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Page 2: React useEffect Lifecycle"
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isDark
                  ? 'bg-slate-800/90 border-white/20 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Quick Suggestions */}
          <div>
            <span className="text-[11px] font-semibold opacity-60 block mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Quick Topic Suggestions:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_SUGGESTIONS.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => handleSelectSuggestion(s)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-black/5 dark:bg-white/5 hover:bg-blue-600/20 hover:text-blue-400 border border-current/10 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-current/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Page</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
