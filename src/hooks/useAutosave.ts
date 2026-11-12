import { useState, useEffect, useCallback, RefObject } from 'react';
import { StorageManager } from '../core/storage/StorageManager';
import { AppWorkspace } from '../types/whiteboard';

interface UseAutosaveOptions {
  workspace: AppWorkspace;
  workspaceRef: RefObject<AppWorkspace>;
  isLoadedRef: RefObject<boolean>;
}

export function useAutosave({
  workspace,
  workspaceRef,
  isLoadedRef,
}: UseAutosaveOptions) {
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [savingTitle, setSavingTitle] = useState<string>('Saving changes...');
  const [savingDetail, setSavingDetail] = useState<string>('Writing data to disk...');
  const [isExiting, setIsExiting] = useState(false);

  // Centralized Save Operation (Fast, non-blocking asynchronous save)
  const performSave = useCallback(
    async (options?: { title?: string; detail?: string; generateHtml?: boolean }) => {
      if (!isLoadedRef.current || !workspaceRef.current) return;
      if (options?.title) setSavingTitle(options.title);
      if (options?.detail) setSavingDetail(options.detail);
      setSaveStatus('saving');

      try {
        await StorageManager.flushImmediate(workspaceRef.current, {
          generateHtml: options?.generateHtml ?? false,
        });
        setSaveStatus('saved');
      } catch (e) {
        console.error('Error saving workspace:', e);
        setSaveStatus('unsaved');
      }
    },
    [isLoadedRef, workspaceRef]
  );

  // Manual Save Trigger (Ctrl+S or TitleBar Save Button)
  const handleManualSave = useCallback(() => {
    performSave({
      generateHtml: false,
    });
  }, [performSave]);

  // Non-blocking, draw-aware background autosave on workspace edits
  useEffect(() => {
    if (!isLoadedRef.current || !workspaceRef.current) return;
    StorageManager.scheduleAutosave(
      () => workspaceRef.current!,
      (status) => setSaveStatus(status),
      2000
    );
  }, [workspace, isLoadedRef, workspaceRef]);

  // Guaranteed Fast Save on Window Close, Page Refresh, or App Exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLoadedRef.current && workspaceRef.current) {
        StorageManager.flushImmediate(workspaceRef.current, { generateHtml: false });
      }
    };

    const handlePageHide = () => {
      if (isLoadedRef.current && workspaceRef.current) {
        StorageManager.flushImmediate(workspaceRef.current, { generateHtml: false });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isLoadedRef, workspaceRef]);

  // Listen for before-quit from Electron main process
  useEffect(() => {
    if (!window.smartBoardAPI?.onBeforeQuit) return;
    const unsub = window.smartBoardAPI.onBeforeQuit(async () => {
      if (isLoadedRef.current && workspaceRef.current) {
        setIsExiting(true);
        setSaveStatus('saving');
        await StorageManager.flushImmediate(workspaceRef.current, { generateHtml: false });
        setSaveStatus('saved');
      }
      window.smartBoardAPI?.sendQuitConfirmed?.();
    });
    return () => unsub();
  }, [isLoadedRef, workspaceRef]);

  // Dedicated App Close Handler for TitleBar Close button
  const handleAppClose = useCallback(async () => {
    if (!isLoadedRef.current || !workspaceRef.current) return;
    setIsExiting(true);
    setSaveStatus('saving');
    await StorageManager.flushImmediate(workspaceRef.current, { generateHtml: false });
    setSaveStatus('saved');
    setTimeout(() => {
      if (window.smartBoardAPI) {
        window.smartBoardAPI.close();
      } else {
        window.close();
      }
    }, 200);
  }, [isLoadedRef, workspaceRef]);

  return {
    saveStatus,
    setSaveStatus,
    savingTitle,
    savingDetail,
    isExiting,
    performSave,
    handleManualSave,
    handleAppClose,
  };
}
