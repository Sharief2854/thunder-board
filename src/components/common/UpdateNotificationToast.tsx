import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { UpdateStatus } from '../../../electron/preload';

interface UpdateNotificationToastProps {
  onOpenSettings?: () => void;
}

export const UpdateNotificationToast: React.FC<UpdateNotificationToastProps> = ({ onOpenSettings }) => {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    if (!window.smartBoardAPI?.onUpdateStatus) return;

    // Get initial status if available
    window.smartBoardAPI.getUpdateStatus?.().then((initial) => {
      if (initial && initial.status !== 'idle') {
        setStatus(initial);
      }
    });

    const unsubscribe = window.smartBoardAPI.onUpdateStatus((newStatus) => {
      setStatus(newStatus);
      // Reset dismissed state when a meaningful new event occurs
      if (newStatus.status === 'available' || newStatus.status === 'downloaded') {
        setIsDismissed(false);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  if (isDismissed || !status) return null;
  if (status.status === 'idle' || status.status === 'not-available') return null;

  const handleDownload = async () => {
    setIsActionPending(true);
    try {
      await window.smartBoardAPI?.downloadUpdate?.();
    } finally {
      setIsActionPending(false);
    }
  };

  const handleInstall = async () => {
    setIsActionPending(true);
    await window.smartBoardAPI?.quitAndInstall?.();
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full bg-slate-900 border border-white/10 text-slate-100 rounded-xl shadow-xl p-4 select-none">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {status.status === 'downloaded' ? (
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : status.status === 'downloading' ? (
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
          ) : status.status === 'error' ? (
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Download className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-white">
              {status.status === 'available' && `ThunderBoard v${status.info?.version || ''} Available`}
              {status.status === 'downloading' && 'Downloading Update...'}
              {status.status === 'downloaded' && 'Update Ready to Install'}
              {status.status === 'error' && 'Update Notice'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {status.status === 'available' && 'A newer version is available.'}
              {status.status === 'downloading' && `${status.progress?.percent || 0}% downloaded`}
              {status.status === 'downloaded' && 'Restart to apply the new version.'}
              {status.status === 'error' && (status.error || 'Could not fetch updates')}
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Download Progress Bar */}
      {status.status === 'downloading' && status.progress && (
        <div className="mt-3">
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${Math.max(5, status.progress.percent)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
            <span>{Math.round((status.progress.transferred / 1024 / 1024) * 10) / 10} MB / {Math.round((status.progress.total / 1024 / 1024) * 10) / 10} MB</span>
            <span>{Math.round((status.progress.bytesPerSecond / 1024 / 1024) * 10) / 10} MB/s</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-end gap-2 pt-2 border-t border-white/10">
        {onOpenSettings && (
          <button
            onClick={() => {
              setIsDismissed(true);
              onOpenSettings();
            }}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-md hover:bg-white/5 transition-colors"
          >
            Preferences
          </button>
        )}

        {status.status === 'available' && (
          <button
            onClick={handleDownload}
            disabled={isActionPending}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            <span>Download</span>
          </button>
        )}

        {status.status === 'downloaded' && (
          <button
            onClick={handleInstall}
            disabled={isActionPending}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Restart & Install</span>
          </button>
        )}
      </div>
    </div>
  );
};
