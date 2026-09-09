import { AppWorkspace, Batch, WhiteboardPage } from '../../types/whiteboard';
import { HtmlViewerGenerator } from '../export/HtmlViewerGenerator';

const WORKSPACE_STORAGE_KEY = 'smartboard_workspace_v2';

export class StorageManager {
  private static saveTimeout: NodeJS.Timeout | null = null;

  /**
   * Generate initial default workspace with a default batch and page
   */
  static createInitialWorkspace(): AppWorkspace {
    const pageId = `page_${Date.now()}`;
    const batchId = `batch_${Date.now()}`;

    const initialPage: WhiteboardPage = {
      id: pageId,
      title: 'Page 1: Introduction & Overview',
      order: 0,
      strokeIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const initialBatch: Batch = {
      id: batchId,
      name: 'Batch 2026 - Web Development',
      subject: 'Frontend & FullStack Masterclass',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activePageId: pageId,
      pages: [initialPage],
      strokes: {},
      theme: 'blackboard',
    };

    return {
      activeBatchId: batchId,
      batches: [initialBatch],
    };
  }

  /**
   * Load entire workspace (all batches) from Electron storage or LocalStorage
   */
  static async loadWorkspace(): Promise<AppWorkspace> {
    try {
      // 1. Try Electron IPC Storage
      if (window.smartBoardAPI) {
        const res = await window.smartBoardAPI.loadBoard('workspace_data');
        if (res.success && res.data) {
          const parsed = JSON.parse(res.data) as AppWorkspace;
          if (parsed && parsed.batches && parsed.batches.length > 0) {
            return parsed;
          }
        }
      }

      // 2. Fallback to LocalStorage
      const localData = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData) as AppWorkspace;
        if (parsed && parsed.batches && parsed.batches.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not load existing workspace, initializing fresh workspace:', err);
    }

    const fresh = this.createInitialWorkspace();
    await this.saveWorkspaceImmediate(fresh);
    return fresh;
  }

  /**
   * Save workspace immediately to Electron storage and LocalStorage
   */
  static async saveWorkspaceImmediate(workspace: AppWorkspace): Promise<boolean> {
    try {
      const payload = JSON.stringify(workspace);

      // 1. Save to LocalStorage
      localStorage.setItem(WORKSPACE_STORAGE_KEY, payload);

      // 2. Save to Electron IPC
      if (window.smartBoardAPI) {
        await window.smartBoardAPI.saveBoard('workspace_data', payload);

        // 3. Save each batch with a custom saveLocation directly to its folder (.sblesson + student .html)
        if (window.smartBoardAPI.saveBatchToDirectory) {
          for (const batch of workspace.batches) {
            if (batch.saveLocation) {
              const batchPayload = JSON.stringify(batch, null, 2);
              const htmlViewer = HtmlViewerGenerator.generateInteractiveHtml(
                batch.name,
                batch.subject || 'Lecture Notes',
                batch.pages,
                batch.strokes || {},
                batch.theme || 'blackboard',
                batch.textElements || {}
              );
              await window.smartBoardAPI.saveBatchToDirectory(
                batch.saveLocation,
                batch.name,
                batchPayload,
                htmlViewer
              );
            }
          }
        }
      }

      return true;
    } catch (err) {
      console.error('Error saving workspace locally:', err);
      return false;
    }
  }

  /**
   * Debounced autosave (triggers 800ms after last stroke or batch change)
   */
  static scheduleAutosave(
    workspace: AppWorkspace,
    onStatusChange: (status: 'saving' | 'saved' | 'unsaved') => void,
    delayMs = 800
  ): void {
    onStatusChange('unsaved');

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      onStatusChange('saving');
      const success = await this.saveWorkspaceImmediate(workspace);
      onStatusChange(success ? 'saved' : 'unsaved');
    }, delayMs);
  }
}
