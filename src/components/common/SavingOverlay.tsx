import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Loader2, X } from 'lucide-react';

export interface SavingOverlayProps {
  isSaving: boolean;
  isExiting?: boolean;
  title?: string;
  detail?: string;
  onClose?: () => void;
}

export const SavingOverlay: React.FC<SavingOverlayProps> = ({
  isSaving,
  isExiting = false,
  title,
  detail,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const prevSavingRef = useRef<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClose = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (isSaving) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setIsOpen(true);
      setIsSuccess(false);
    } else if (prevSavingRef.current && !isSaving) {
      setIsSuccess(true);
      setIsOpen(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
        timerRef.current = null;
        onClose?.();
      }, 1000);
    }
    prevSavingRef.current = isSaving;
  }, [isSaving, onClose]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 1. Clean Fullscreen Modal for App Exit
  if (isExiting) {
    return (
      <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-slate-100 select-none">
        <div className="flex flex-col items-center max-w-sm px-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          </div>
          <h2 className="text-base font-semibold text-white mb-1">
            {title || 'Saving Workspace'}
          </h2>
          <p className="text-xs text-slate-400">
            {detail || 'Committing board state and syncing lesson notes...'}
          </p>
        </div>
      </div>
    );
  }

  // 2. Minimalist, Professional Status Pill in Bottom Right
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[99990] select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div
        className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 shadow-lg ${
          isSuccess
            ? 'bg-slate-900/95 border-emerald-500/30 text-emerald-400'
            : 'bg-slate-900/95 border-slate-800 text-slate-300'
        }`}
      >
        {isSuccess ? (
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
        )}

        <span className="truncate max-w-[200px]">
          {isSuccess ? 'Saved' : title || 'Saving changes...'}
        </span>

        <button
          onClick={handleClose}
          className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
