import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, BookOpen } from 'lucide-react';
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
        className={`relative z-10 w-full max-w-md rounded-xl shadow-xl border p-5 select-none ${
          isDark
            ? 'bg-slate-900 border-white/10 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Create New Page</span>
            <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300">
              #{pageNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-slate-300">
              Page Title or Topic
            </label>
            <input
              ref={inputRef}
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="e.g. Page 2: React useEffect Lifecycle"
              className={`w-full px-3 py-2 rounded-lg text-sm font-normal border transition-colors focus:outline-none focus:border-blue-500 ${
                isDark
                  ? 'bg-slate-800 border-white/10 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Quick Suggestions */}
          <div>
            <span className="text-xs text-slate-400 block mb-1.5 font-medium">
              Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TOPIC_SUGGESTIONS.map(s => (
                <button
                  type="button"
                  key={s}
                  onClick={() => handleSelectSuggestion(s)}
                  className="px-2.5 py-1 rounded-md text-xs font-normal bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors"
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
