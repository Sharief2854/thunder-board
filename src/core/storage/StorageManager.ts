import { AppWorkspace, Batch, WhiteboardPage } from '../../types/whiteboard';
import { HtmlViewerGenerator } from '../export/HtmlViewerGenerator';

const WORKSPACE_STORAGE_KEY = 'smartboard_workspace_v2';

/**
 * Lightweight native IndexedDB wrapper for asynchronous client storage.
 * Completely eliminates UI-thread blocking and 5MB storage limits.
 */
class IndexedDbStorage {
  private static DB_NAME = 'ThunderBoardDB';
  private static STORE_NAME = 'workspace_store';
  private static DB_VERSION = 1;

  private static open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not supported'));
      }
      const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  static async get(key: string): Promise<string | null> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readonly');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  static async set(key: string, value: string): Promise<void> {
    try {
      const db = await this.open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, 'readwrite');
        const store = tx.objectStore(this.STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('IndexedDB set failed:', err);
    }
  }
}

export class StorageManager {
  private static saveTimeout: NodeJS.Timeout | null = null;
  private static isDrawingActive: boolean = false;
  private static lastDrawingActivityTime: number = 0;

  /**
   * Signal from canvas whether pointer is actively inking
   */
  static setDrawingActive(active: boolean): void {
    this.isDrawingActive = active;
    if (active) {
      this.lastDrawingActivityTime = Date.now();
    }
  }

  /**
   * Record drawing timestamp to debounce autosave during active writing
   */
  static recordDrawingActivity(): void {
    this.lastDrawingActivityTime = Date.now();
  }

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
   * Load entire workspace from Electron storage, IndexedDB, or legacy LocalStorage migration
   */
  static async loadWorkspace(): Promise<AppWorkspace> {
    try {
      // 1. Try Electron IPC Storage (asynchronous disk file)
      if (window.smartBoardAPI) {
        const res = await window.smartBoardAPI.loadBoard('workspace_data');
        if (res.success && res.data) {
          const parsed = JSON.parse(res.data) as AppWorkspace;
          if (parsed && parsed.batches && parsed.batches.length > 0) {
            return parsed;
          }
        }
      }

      // 2. Try Asynchronous IndexedDB Storage
      const idbData = await IndexedDbStorage.get('workspace_data');
      if (idbData) {
        const parsed = JSON.parse(idbData) as AppWorkspace;
        if (parsed && parsed.batches && parsed.batches.length > 0) {
          return parsed;
        }
      }

      // 3. One-time Migration from legacy LocalStorage
      const localData = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData) as AppWorkspace;
        if (parsed && parsed.batches && parsed.batches.length > 0) {
          // Migrate to async storage and clean up localStorage immediately
          await this.saveWorkspaceImmediate(parsed);
          try {
            localStorage.removeItem(WORKSPACE_STORAGE_KEY);
          } catch {}
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
   * Save workspace immediately without UI-thread blocking.
   * `options.generateHtml`: when true, also compiles and updates student interactive HTML viewer.
   */
  static async saveWorkspaceImmediate(
    workspace: AppWorkspace,
    options?: { generateHtml?: boolean }
  ): Promise<boolean> {
    try {
      const payload = JSON.stringify(workspace);

      // 1. Asynchronously save in IndexedDB (non-blocking, unlimited capacity)
      IndexedDbStorage.set('workspace_data', payload).catch(() => {});

      // 2. Save via Electron IPC (async disk write via fs.promises.writeFile)
      if (window.smartBoardAPI) {
        await window.smartBoardAPI.saveBoard('workspace_data', payload);

        // 3. Save batch folders if custom saveLocation is set
        if (window.smartBoardAPI.saveBatchToDirectory) {
          for (const batch of workspace.batches) {
            if (batch.saveLocation) {
              const batchPayload = JSON.stringify(batch, null, 2);

              // Only generate heavy HTML notes when explicitly requested (e.g. closing, exporting, batch change)
              let htmlViewer: string | undefined = undefined;
              if (options?.generateHtml) {
                htmlViewer = HtmlViewerGenerator.generateInteractiveHtml(
                  batch.name,
                  batch.subject || 'Lecture Notes',
                  batch.pages,
                  batch.strokes || {},
                  batch.theme || 'blackboard',
                  batch.textElements || {}
                );
              }

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
      console.error('Error saving workspace:', err);
      return false;
    }
  }

  /**
   * Immediately flushes any pending autosave and writes workspace to disk/IndexedDB.
   * Used for app close, page refresh, batch switching, and file imports.
   */
  static async flushImmediate(
    workspace: AppWorkspace,
    options?: { generateHtml?: boolean }
  ): Promise<boolean> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    return this.saveWorkspaceImmediate(workspace, options);
  }

  /**
   * Draw-Aware, Idle-Scheduled Autosave.
   * Never interrupts active drawing strokes or frame rendering.
   */
  static scheduleAutosave(
    workspace: AppWorkspace,
    onStatusChange: (status: 'saving' | 'saved' | 'unsaved') => void,
    delayMs = 2000
  ): void {
    onStatusChange('unsaved');

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    const checkAndSave = () => {
      // If user is currently drawing or drew in the last 1800ms, postpone saving
      const timeSinceLastDraw = Date.now() - this.lastDrawingActivityTime;
      if (this.isDrawingActive || timeSinceLastDraw < 1800) {
        this.saveTimeout = setTimeout(checkAndSave, 1000);
        return;
      }

      // Execute during browser idle callback so inking and animation frames are never dropped
      const runSave = async () => {
        onStatusChange('saving');
        const success = await this.saveWorkspaceImmediate(workspace, { generateHtml: false });
        onStatusChange(success ? 'saved' : 'unsaved');
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          runSave();
        }, { timeout: 3000 });
      } else {
        setTimeout(runSave, 50);
      }
    };

    this.saveTimeout = setTimeout(checkAndSave, delayMs);
  }
}
