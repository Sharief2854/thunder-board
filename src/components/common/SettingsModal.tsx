import React, { useState, useEffect } from 'react';
import { X, Sliders, Navigation, Pin, Image, Monitor, MousePointerClick, RefreshCw, Download, Check, ArrowUpCircle } from 'lucide-react';
import { BoardThemeType } from '../../types/whiteboard';
import { UpdateStatus } from '../../../electron/preload';

export interface AppSettings {
  autoIconGeneration: boolean;
  showNavigation: boolean;
  pinPenToolbar: boolean;
  autoSnapShapes: boolean;
  quickTapGestures: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  theme: BoardThemeType;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ icon, title, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-slate-800/80 last:border-b-0">
    <div className="flex items-start gap-3 pr-4">
      <div className="mt-0.5 text-slate-400 shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium text-slate-200">{title}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{description}</div>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`w-9 h-5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${
        enabled ? 'bg-blue-600' : 'bg-slate-700'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [appVersion, setAppVersion] = useState('3.0.0');

  useEffect(() => {
    if (!isOpen) return;

    window.smartBoardAPI?.getAppVersion?.().then((v) => {
      if (v) setAppVersion(v);
    });

    window.smartBoardAPI?.getUpdateStatus?.().then((status) => {
      if (status) setUpdateStatus(status);
    });

    const unsubscribe = window.smartBoardAPI?.onUpdateStatus?.((newStatus) => {
      setUpdateStatus(newStatus);
      if (newStatus.status !== 'checking') {
        setIsChecking(false);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [isOpen]);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      const res = await window.smartBoardAPI?.checkForUpdates?.();
      if (res?.message) {
        setUpdateStatus({
          status: 'not-available',
          devMessage: res.message,
          currentVersion: appVersion,
        });
      }
    } catch (err: any) {
      setUpdateStatus({
        status: 'error',
        error: err?.message || 'Failed to check for updates',
        currentVersion: appVersion,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      await window.smartBoardAPI?.downloadUpdate?.();
    } catch (err: any) {
      setUpdateStatus((prev) => ({
        status: 'error',
        error: err?.message || 'Download failed',
        currentVersion: prev?.currentVersion || appVersion,
      }));
    }
  };

  const handleQuitAndInstall = async () => {
    await window.smartBoardAPI?.quitAndInstall?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-xs" />

      <div className="relative z-10 w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h2 className="font-semibold text-sm tracking-tight text-white">Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Settings Body */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Section 1: Inking & Navigation */}
          <div>
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Inking & Tools
            </h3>
            <div className="bg-slate-950/40 rounded-lg border border-slate-800/80 px-4">
              <ToggleRow
                icon={<Pin className="w-4 h-4" />}
                title="Pin Tools Toolbar"
                description="Keep inking tools expanded without collapsing on hover"
                enabled={settings.pinPenToolbar}
                onChange={(val) => onUpdateSettings({ pinPenToolbar: val })}
              />
              <ToggleRow
                icon={<Navigation className="w-4 h-4" />}
                title="Canvas Minimap"
                description="Display floating minimap overview at bottom-right"
                enabled={settings.showNavigation}
                onChange={(val) => onUpdateSettings({ showNavigation: val })}
              />
              <ToggleRow
                icon={<Monitor className="w-4 h-4" />}
                title="Auto-Snap Shapes"
                description="Snap rough hand-drawn circles and boxes into geometric shapes"
                enabled={settings.autoSnapShapes}
                onChange={(val) => onUpdateSettings({ autoSnapShapes: val })}
              />
              <ToggleRow
                icon={<MousePointerClick className="w-4 h-4" />}
                title="Multi-Click Gestures"
                description="2 clicks to cycle pen colors | 3 clicks to toggle Pen and Eraser"
                enabled={settings.quickTapGestures}
                onChange={(val) => onUpdateSettings({ quickTapGestures: val })}
              />
              <ToggleRow
                icon={<Image className="w-4 h-4" />}
                title="Auto Icon Generation"
                description="Generate workspace icons automatically for new batches"
                enabled={settings.autoIconGeneration}
                onChange={(val) => onUpdateSettings({ autoIconGeneration: val })}
              />
            </div>
          </div>

          {/* Section 2: Software Updates */}
          <div>
            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Updates & Releases
            </h3>
            <div className="bg-slate-950/40 rounded-lg border border-slate-800/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ArrowUpCircle className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-xs font-medium text-slate-200 flex items-center gap-2">
                      <span>ThunderBoard v{appVersion}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">
                        {updateStatus?.status === 'available'
                          ? 'Update Available'
                          : updateStatus?.status === 'downloaded'
                          ? 'Ready to Install'
                          : updateStatus?.status === 'downloading'
                          ? 'Downloading'
                          : 'Latest'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">Auto-update via GitHub Releases</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckForUpdates}
                  disabled={isChecking || updateStatus?.status === 'downloading'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isChecking || updateStatus?.status === 'checking' ? 'animate-spin' : ''}`} />
                  <span>{isChecking || updateStatus?.status === 'checking' ? 'Checking...' : 'Check Updates'}</span>
                </button>
              </div>

              {/* Status Notice Banners */}
              {updateStatus?.status === 'available' && (
                <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 space-y-2">
                  <div className="text-xs font-medium text-blue-300">
                    Version {updateStatus.info?.version} is available to download.
                  </div>
                  {updateStatus.info?.releaseNotes && (
                    <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono text-[10px]">
                      {updateStatus.info.releaseNotes}
                    </div>
                  )}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadUpdate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Update</span>
                    </button>
                  </div>
                </div>
              )}

              {updateStatus?.status === 'downloading' && updateStatus.progress && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Downloading update...</span>
                    <span className="font-mono text-blue-400 font-bold">{updateStatus.progress.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-200"
                      style={{ width: `${Math.max(5, updateStatus.progress.percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>{Math.round((updateStatus.progress.transferred / 1024 / 1024) * 10) / 10} MB / {Math.round((updateStatus.progress.total / 1024 / 1024) * 10) / 10} MB</span>
                    <span>{Math.round((updateStatus.progress.bytesPerSecond / 1024 / 1024) * 10) / 10} MB/s</span>
                  </div>
                </div>
              )}

              {updateStatus?.status === 'downloaded' && (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span>Update ready to install</span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Restart ThunderBoard to apply the update.
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleQuitAndInstall}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Restart & Install</span>
                    </button>
                  </div>
                </div>
              )}

              {updateStatus?.devMessage && (
                <div className="text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded border border-slate-800">
                  {updateStatus.devMessage}
                </div>
              )}

              {updateStatus?.status === 'not-available' && !updateStatus?.devMessage && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>You are using the latest version of ThunderBoard.</span>
                </div>
              )}

              {updateStatus?.status === 'error' && (
                <div className="text-[11px] text-red-400 bg-red-950/20 p-2.5 rounded border border-red-800/30">
                  {updateStatus.error || 'Failed to check updates.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/60 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
