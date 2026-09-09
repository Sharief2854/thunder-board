import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from '../components/layout/TitleBar';
import { WhiteboardCanvas } from '../components/canvas/WhiteboardCanvas';
import { Toolbar } from '../components/toolbar/Toolbar';
import { Minimap } from '../components/minimap/Minimap';
import { PageNavigationHUD } from '../components/pages/PageNavigationHUD';
import { PageDrawer } from '../components/pages/PageDrawer';
import { NewPageModal } from '../components/pages/NewPageModal';
import { BatchManagerModal } from '../components/batches/BatchManagerModal';
import { ShareModal } from '../components/export/ShareModal';
import {
  AppWorkspace,
  Batch,
  BoardThemeType,
  Stroke,
  StrokeTool,
  ShapeType,
  TextBoxElement,
  ViewportTransform,
  WhiteboardDocument,
  WhiteboardPage,
} from '../types/whiteboard';
import { WHITEBOARD_THEME, BLACKBOARD_THEME } from '../types/theme';
import { CanvasController } from '../core/canvas/CanvasController';
import { StorageManager } from '../core/storage/StorageManager';
import { SyntaxHighlighterEngine } from '../core/syntax/SyntaxHighlighterEngine';
import { ContextAwareSyntaxEngine } from '../core/syntax/ContextAwareSyntaxEngine';
import { ModelTrainerModal } from '../components/syntax/ModelTrainerModal';
import { MovableTextBox } from '../components/canvas/MovableTextBox';
import { TextBoxTypeModal } from '../components/canvas/TextBoxTypeModal';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { SettingsModal, AppSettings } from '../components/common/SettingsModal';

export const App: React.FC = () => {
  // --- Workspace & Batches State ---
  const [workspace, setWorkspace] = useState<AppWorkspace>(() =>
    StorageManager.createInitialWorkspace()
  );

  const activeBatch =
    workspace.batches.find(b => b.id === workspace.activeBatchId) || workspace.batches[0];

  const activePage =
    activeBatch.pages.find(p => p.id === activeBatch.activePageId) || activeBatch.pages[0];

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Modals & Drawers State
  const [isPageDrawerOpen, setIsPageDrawerOpen] = useState(false);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [isBatchManagerOpen, setIsBatchManagerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetPage, setShareTargetPage] = useState<WhiteboardPage | null>(null);
  const [isModelTrainerOpen, setIsModelTrainerOpen] = useState(false);
  const [isTextBoxTypeModalOpen, setIsTextBoxTypeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App User Preferences & Settings (Persisted in localStorage)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('thunderboard_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      autoIconGeneration: true,
      showNavigation: true,
      pinPenToolbar: localStorage.getItem('smartboard_toolbar_pinned') === 'true',
      autoSnapShapes: false,
    };
  });

  const handleUpdateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('thunderboard_settings', JSON.stringify(updated));
        if (newSettings.pinPenToolbar !== undefined) {
          localStorage.setItem('smartboard_toolbar_pinned', String(newSettings.pinPenToolbar));
        }
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // App Startup Splash & Smooth Loading Screen State
  const [showLoadingScreen, setShowLoadingScreen] = useState<boolean>(true);
  const [isLoadingFadingOut, setIsLoadingFadingOut] = useState<boolean>(false);

  useEffect(() => {
    // Keep splash loading screen active briefly to let canvas and state settle
    const timerFade = setTimeout(() => {
      setIsLoadingFadingOut(true);
    }, 600);

    const timerRemove = setTimeout(() => {
      setShowLoadingScreen(false);
    }, 1300);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerRemove);
    };
  }, []);

  // Drawing Tools State & Per-Tool Size Memory
  const [tool, setTool] = useState<StrokeTool>('pen');
  const [color, setColor] = useState<string>(BLACKBOARD_THEME.penColors[0].value);
  const [toolSizes, setToolSizes] = useState<Record<StrokeTool, number>>({
    pen: 4,
    pencil: 2,
    highlighter: 18,
    'stroke-eraser': 20,
    select: 4,
    pan: 4,
    text: 16,
    shape: 4,
  });

  // Active Shape Type
  const [activeShapeType, setActiveShapeType] = useState<ShapeType>('rectangle');
  const isAutoSnapEnabled = settings.autoSnapShapes;

  const currentWidth = toolSizes[tool] || 4;

  // Handwritten Syntax Highlighter Active State (Turned OFF by default)
  const [isCodeHighlightActive, setIsCodeHighlightActive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('thunderboard_code_highlight');
      if (saved !== null) return saved === 'true';
    } catch {}
    return false;
  });

  const handleToggleCodeHighlight = useCallback(() => {
    setIsCodeHighlightActive(prev => {
      const next = !prev;
      try {
        localStorage.setItem('thunderboard_code_highlight', String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleSelectTool = useCallback((newTool: StrokeTool) => {
    setTool(newTool);
  }, []);

  const handleSelectWidth = useCallback(
    (newWidth: number) => {
      setToolSizes(prev => ({
        ...prev,
        [tool]: newWidth,
      }));
    },
    [tool]
  );

  // Viewport Transform (Pan / Zoom)
  const [transform, setTransform] = useState<ViewportTransform>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({
    width: window.innerWidth || 1024,
    height: window.innerHeight || 768,
  });

  const handleCanvasSizeChange = useCallback((width: number, height: number) => {
    setCanvasSize(prev => {
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  // Stroke Undo / Redo History (Per-page history stacks)
  const [history, setHistory] = useState<Record<string, Stroke[][]>>({});
  const [redoStack, setRedoStack] = useState<Record<string, Stroke[][]>>({});

  // Active page's strokes
  const currentStrokes = Object.values(activeBatch.strokes || {}).filter(
    s => s.pageId === activePage.id && !s.isErased
  );

  // Active page's movable text / code boxes
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const currentTextElements = Object.values(activeBatch.textElements || {}).filter(
    t => t.pageId === activePage.id
  );

  // Add new Movable Text / Code Box
  const handleAddTextBox = useCallback(
    (initialMode: 'text' | 'code' = 'code') => {
      const id = `text_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      // Position at center of current viewport
      const worldCenterX = Math.round((-transform.x + (canvasSize.width / 2) - 160) / transform.zoom);
      const worldCenterY = Math.round((-transform.y + (canvasSize.height / 2) - 80) / transform.zoom);

      const newElem: TextBoxElement = {
        id,
        pageId: activePage.id,
        x: worldCenterX,
        y: worldCenterY,
        width: 340,
        height: 160,
        content: initialMode === 'code' ? 'function greet() {\n  console.log("Hello, ThunderBoard!");\n}' : 'Notes here...',
        mode: initialMode,
        language: 'javascript',
        fontSize: 16,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setWorkspace(prev => {
        const nextBatches = prev.batches.map(b => {
          if (b.id !== prev.activeBatchId) return b;
          return {
            ...b,
            textElements: {
              ...(b.textElements || {}),
              [id]: newElem,
            },
            updatedAt: Date.now(),
          };
        });
        return { ...prev, batches: nextBatches };
      });

      setSelectedTextId(id);
    },
    [activePage.id, transform, canvasSize]
  );

  // Update a Movable Text Box (drag, resize, content edit)
  const handleUpdateTextBox = useCallback((updated: TextBoxElement) => {
    setWorkspace(prev => {
      const nextBatches = prev.batches.map(b => {
        if (b.id !== prev.activeBatchId) return b;
        return {
          ...b,
          textElements: {
            ...(b.textElements || {}),
            [updated.id]: updated,
          },
          updatedAt: Date.now(),
        };
      });
      return { ...prev, batches: nextBatches };
    });
  }, []);

  // Delete a Movable Text Box
  const handleDeleteTextBox = useCallback((id: string) => {
    setWorkspace(prev => {
      const nextBatches = prev.batches.map(b => {
        if (b.id !== prev.activeBatchId) return b;
        const copy = { ...(b.textElements || {}) };
        delete copy[id];
        return {
          ...b,
          textElements: copy,
          updatedAt: Date.now(),
        };
      });
      return { ...prev, batches: nextBatches };
    });
    setSelectedTextId(null);
  }, []);

  // Flag to prevent saving initial unpopulated load
  const isLoadedRef = useRef(false);

  // Load Workspace from Local Storage / Electron on Mount
  useEffect(() => {
    const initLoad = async () => {
      const loaded = await StorageManager.loadWorkspace();
      if (loaded && loaded.batches && loaded.batches.length > 0) {
        setWorkspace(loaded);
        setSaveStatus('saved');
      }
      isLoadedRef.current = true;
    };

    initLoad();
  }, []);

  // Trigger Automatic Debounced Autosave on Any Workspace Change
  useEffect(() => {
    if (!isLoadedRef.current) return;
    StorageManager.scheduleAutosave(workspace, setSaveStatus, 800);
  }, [workspace]);

  // Adapt current ink color when theme changes
  const toggleTheme = useCallback(() => {
    setWorkspace(prev => {
      const nextBatches = prev.batches.map(b => {
        if (b.id !== prev.activeBatchId) return b;
        const nextTheme: BoardThemeType = b.theme === 'whiteboard' ? 'blackboard' : 'whiteboard';
        const nextPalette = nextTheme === 'whiteboard' ? WHITEBOARD_THEME : BLACKBOARD_THEME;
        setColor(nextPalette.penColors[0].value);
        return { ...b, theme: nextTheme, updatedAt: Date.now() };
      });
      return { ...prev, batches: nextBatches };
    });
  }, []);

  // Commit a newly drawn stroke to active batch
  const handleStrokeComplete = useCallback(
    (stroke: Stroke) => {
      const pageId = activePage.id;

      if (stroke.tool === 'stroke-eraser') {
        // Stroke eraser: erase strokes on the active page intersecting eraser bounds
        setWorkspace(prev => {
          const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId) || prev.batches[0];
          const currentList = Object.values(currentBatchObj.strokes || {}).filter(
            s => s.pageId === pageId && !s.isErased
          );

          setHistory(h => ({
            ...h,
            [pageId]: [...(h[pageId] || []), currentList],
          }));
          setRedoStack(r => ({
            ...r,
            [pageId]: [],
          }));

          const updatedStrokes = { ...(currentBatchObj.strokes || {}) };
          for (const s of Object.values(updatedStrokes)) {
            if (s.pageId !== pageId || s.isErased) continue;
            const sBox = s.boundingBox;
            const eBox = stroke.boundingBox;
            const overlaps = !(
              sBox.maxX < eBox.minX ||
              sBox.minX > eBox.maxX ||
              sBox.maxY < eBox.minY ||
              sBox.minY > eBox.maxY
            );
            if (overlaps) {
              updatedStrokes[s.id] = { ...s, isErased: true };
            }
          }

          const nextBatches = prev.batches.map(b =>
            b.id === prev.activeBatchId
              ? { ...b, strokes: updatedStrokes, updatedAt: Date.now() }
              : b
          );

          return { ...prev, batches: nextBatches };
        });
        return;
      }

      setWorkspace(prev => {
        const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId) || prev.batches[0];
        const currentList = Object.values(currentBatchObj.strokes || {}).filter(
          s => s.pageId === pageId && !s.isErased
        );

        setHistory(h => ({
          ...h,
          [pageId]: [...(h[pageId] || []), currentList],
        }));
        setRedoStack(r => ({
          ...r,
          [pageId]: [],
        }));

        const updatedStrokes: Record<string, Stroke> = {
          ...(currentBatchObj.strokes || {}),
          [stroke.id]: stroke,
        };

        // In-Place Handwritten Syntax Highlighting (Options 1, 2, 3)
        if (isCodeHighlightActive && stroke.tool !== 'stroke-eraser') {
          const currentTheme = currentBatchObj.theme || 'blackboard';
          const pageStrokes = Object.values(updatedStrokes).filter(
            s => s.pageId === pageId && !s.isErased && s.tool !== 'stroke-eraser'
          );

          // 1. Check for Underline Gesture (Option 2)
          const underlineMatch = SyntaxHighlighterEngine.detectUnderlineGesture(stroke, pageStrokes);
          if (underlineMatch) {
            const { targetCluster } = underlineMatch;
            const clusterStrokes = targetCluster.strokeIds
              .map(id => updatedStrokes[id])
              .filter(Boolean);

            const detected = SyntaxHighlighterEngine.detectSymbolInStrokes(clusterStrokes) || 'keyword';
            const palette = SyntaxHighlighterEngine.applySyntaxHighlighting(
              updatedStrokes,
              currentTheme,
              targetCluster.strokeIds.map(id => ({ strokeId: id, tokenType: detected }))
            );
            Object.assign(updatedStrokes, palette.updatedStrokes);
          } else {
            // 2. Context-Aware Cluster Recognition & Custom Trained Model
            const clusters = SyntaxHighlighterEngine.clusterStrokesIntoWords(pageStrokes);
            for (const cluster of clusters) {
              const clusterStrokes = cluster.strokeIds
                .map(id => updatedStrokes[id])
                .filter(Boolean);

              // Analyze stroke using trained Point-Cloud model + Surrounding Context (neighbors, unclosed braces)
              const contextResult = ContextAwareSyntaxEngine.analyzeWithContext(
                cluster,
                clusterStrokes,
                pageStrokes
              );

              if (contextResult) {
                const palette = SyntaxHighlighterEngine.applySyntaxHighlighting(
                  updatedStrokes,
                  currentTheme,
                  cluster.strokeIds.map(id => ({ strokeId: id, tokenType: contextResult.tokenType }))
                );
                if (palette.changedCount > 0) {
                  Object.assign(updatedStrokes, palette.updatedStrokes);
                }
              }
            }
          }
        }

        const nextBatches = prev.batches.map(b =>
          b.id === prev.activeBatchId
            ? { ...b, strokes: updatedStrokes, updatedAt: Date.now() }
            : b
        );

        return { ...prev, batches: nextBatches };
      });
    },
    [activePage.id, isCodeHighlightActive]
  );

  // Undo (Page-Specific)
  const handleUndo = useCallback(() => {
    const pageId = activePage.id;
    const pageHistory = history[pageId] || [];
    if (pageHistory.length === 0) return;

    const previousPageStrokes = pageHistory[pageHistory.length - 1];
    const currentPageStrokes = Object.values(activeBatch.strokes || {}).filter(
      s => s.pageId === pageId && !s.isErased
    );

    setRedoStack(r => ({
      ...r,
      [pageId]: [...(r[pageId] || []), currentPageStrokes],
    }));

    setHistory(h => ({
      ...h,
      [pageId]: pageHistory.slice(0, pageHistory.length - 1),
    }));

    setWorkspace(prev => {
      const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId) || prev.batches[0];
      const updated = { ...(currentBatchObj.strokes || {}) };

      for (const s of Object.values(updated)) {
        if (s.pageId === pageId) {
          updated[s.id] = { ...s, isErased: true };
        }
      }
      for (const s of previousPageStrokes) {
        updated[s.id] = { ...s, isErased: false };
      }

      const nextBatches = prev.batches.map(b =>
        b.id === prev.activeBatchId ? { ...b, strokes: updated, updatedAt: Date.now() } : b
      );
      return { ...prev, batches: nextBatches };
    });
  }, [activePage.id, history, activeBatch.strokes]);

  // Redo (Page-Specific)
  const handleRedo = useCallback(() => {
    const pageId = activePage.id;
    const pageRedos = redoStack[pageId] || [];
    if (pageRedos.length === 0) return;

    const nextPageStrokes = pageRedos[pageRedos.length - 1];
    const currentPageStrokes = Object.values(activeBatch.strokes || {}).filter(
      s => s.pageId === pageId && !s.isErased
    );

    setHistory(h => ({
      ...h,
      [pageId]: [...(h[pageId] || []), currentPageStrokes],
    }));

    setRedoStack(r => ({
      ...r,
      [pageId]: pageRedos.slice(0, pageRedos.length - 1),
    }));

    setWorkspace(prev => {
      const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId) || prev.batches[0];
      const updated = { ...(currentBatchObj.strokes || {}) };

      for (const s of Object.values(updated)) {
        if (s.pageId === pageId) {
          updated[s.id] = { ...s, isErased: true };
        }
      }
      for (const s of nextPageStrokes) {
        updated[s.id] = { ...s, isErased: false };
      }

      const nextBatches = prev.batches.map(b =>
        b.id === prev.activeBatchId ? { ...b, strokes: updated, updatedAt: Date.now() } : b
      );
      return { ...prev, batches: nextBatches };
    });
  }, [activePage.id, redoStack, activeBatch.strokes]);

  // Clear Board for Active Page
  const handleClear = useCallback(() => {
    const pageId = activePage.id;
    const currentPageStrokes = Object.values(activeBatch.strokes || {}).filter(
      s => s.pageId === pageId && !s.isErased
    );
    if (currentPageStrokes.length === 0) return;

    setHistory(h => ({
      ...h,
      [pageId]: [...(h[pageId] || []), currentPageStrokes],
    }));
    setRedoStack(r => ({
      ...r,
      [pageId]: [],
    }));

    setWorkspace(prev => {
      const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId) || prev.batches[0];
      const updated = { ...(currentBatchObj.strokes || {}) };

      for (const s of Object.values(updated)) {
        if (s.pageId === pageId) {
          updated[s.id] = { ...s, isErased: true };
        }
      }

      const nextBatches = prev.batches.map(b =>
        b.id === prev.activeBatchId ? { ...b, strokes: updated, updatedAt: Date.now() } : b
      );
      return { ...prev, batches: nextBatches };
    });
  }, [activePage.id, activeBatch.strokes]);

  // Zoom Operations
  const handleZoomIn = useCallback(() => {
    setTransform(prev => ({
      x: prev.x - (canvasSize.width / 2 - prev.x) * 0.2,
      y: prev.y - (canvasSize.height / 2 - prev.y) * 0.2,
      zoom: Math.min(CanvasController.MAX_ZOOM, prev.zoom * 1.2),
    }));
  }, [canvasSize]);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => ({
      x: prev.x + (canvasSize.width / 2 - prev.x) * 0.166,
      y: prev.y + (canvasSize.height / 2 - prev.y) * 0.166,
      zoom: Math.max(CanvasController.MIN_ZOOM, prev.zoom * 0.8),
    }));
  }, [canvasSize]);

  const handleResetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, zoom: 1 });
  }, []);

  const handleFitToContent = useCallback(() => {
    const next = CanvasController.fitToScreen(
      currentStrokes,
      canvasSize.width,
      canvasSize.height,
      80,
      currentTextElements
    );
    setTransform(next);
  }, [currentStrokes, canvasSize, currentTextElements]);

  // --- Page Operations with Topic Prompt ---
  const handleCreatePageWithTopic = useCallback(
    (topicTitle: string) => {
      const newPageId = `page_${Date.now()}`;
      const newPage: WhiteboardPage = {
        id: newPageId,
        title: topicTitle,
        order: activeBatch.pages.length,
        strokeIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setWorkspace(prev => {
        const nextBatches = prev.batches.map(b => {
          if (b.id !== prev.activeBatchId) return b;
          return {
            ...b,
            pages: [...b.pages, newPage],
            activePageId: newPageId,
            updatedAt: Date.now(),
          };
        });
        return { ...prev, batches: nextBatches };
      });

      setTransform({ x: 0, y: 0, zoom: 1 });
    },
    [activeBatch.pages.length]
  );

  const handleSelectPage = useCallback((pageId: string) => {
    setWorkspace(prev => ({
      ...prev,
      batches: prev.batches.map(b =>
        b.id === prev.activeBatchId ? { ...b, activePageId: pageId } : b
      ),
    }));
    setTransform({ x: 0, y: 0, zoom: 1 });
  }, []);

  const handleRenamePage = useCallback((pageId: string, newTitle: string) => {
    setWorkspace(prev => ({
      ...prev,
      batches: prev.batches.map(b =>
        b.id === prev.activeBatchId
          ? {
              ...b,
              pages: b.pages.map(p => (p.id === pageId ? { ...p, title: newTitle, updatedAt: Date.now() } : p)),
            }
          : b
      ),
    }));
  }, []);

  const handleDuplicatePage = useCallback((pageId: string) => {
    const sourcePage = activeBatch.pages.find(p => p.id === pageId);
    if (!sourcePage) return;

    const newPageId = `page_${Date.now()}`;
    const newPage: WhiteboardPage = {
      id: newPageId,
      title: `${sourcePage.title} (Copy)`,
      order: activeBatch.pages.length,
      strokeIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const sourceStrokes = Object.values(activeBatch.strokes || {}).filter(
      s => s.pageId === pageId && !s.isErased
    );

    const duplicatedStrokes: Record<string, Stroke> = {};
    for (const s of sourceStrokes) {
      const newStrokeId = `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      duplicatedStrokes[newStrokeId] = {
        ...s,
        id: newStrokeId,
        pageId: newPageId,
        createdAt: Date.now(),
      };
    }

    setWorkspace(prev => ({
      ...prev,
      batches: prev.batches.map(b =>
        b.id === prev.activeBatchId
          ? {
              ...b,
              pages: [...b.pages, newPage],
              activePageId: newPageId,
              strokes: { ...(b.strokes || {}), ...duplicatedStrokes },
              updatedAt: Date.now(),
            }
          : b
      ),
    }));
  }, [activeBatch]);

  const handleDeletePage = useCallback((pageId: string) => {
    if (activeBatch.pages.length <= 1) return;

    setWorkspace(prev => {
      const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId) || prev.batches[0];
      const remaining = currentBatchObj.pages.filter(p => p.id !== pageId);
      const newActive = currentBatchObj.activePageId === pageId ? remaining[0].id : currentBatchObj.activePageId;

      const updatedStrokes = { ...(currentBatchObj.strokes || {}) };
      for (const s of Object.values(updatedStrokes)) {
        if (s.pageId === pageId) {
          delete updatedStrokes[s.id];
        }
      }

      const nextBatches = prev.batches.map(b =>
        b.id === prev.activeBatchId
          ? {
              ...b,
              pages: remaining,
              activePageId: newActive,
              strokes: updatedStrokes,
              updatedAt: Date.now(),
            }
          : b
      );

      return { ...prev, batches: nextBatches };
    });
  }, [activeBatch.pages.length]);

  const handleReorderPages = useCallback((startIndex: number, endIndex: number) => {
    setWorkspace(prev => {
      const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId) || prev.batches[0];
      const reordered = [...currentBatchObj.pages];
      if (
        startIndex < 0 ||
        startIndex >= reordered.length ||
        endIndex < 0 ||
        endIndex >= reordered.length
      ) {
        return prev;
      }
      const [moved] = reordered.splice(startIndex, 1);
      reordered.splice(endIndex, 0, moved);

      const nextBatches = prev.batches.map(b =>
        b.id === prev.activeBatchId
          ? { ...b, pages: reordered.map((p, idx) => ({ ...p, order: idx })), updatedAt: Date.now() }
          : b
      );

      return { ...prev, batches: nextBatches };
    });
  }, []);

  // --- Batch Operations ---
  const handleCreateBatch = useCallback((name: string, subject: string, saveLocation?: string) => {
    const pageId = `page_${Date.now()}`;
    const batchId = `batch_${Date.now()}`;

    const newPage: WhiteboardPage = {
      id: pageId,
      title: 'Page 1: Introduction',
      order: 0,
      strokeIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const newBatch: Batch = {
      id: batchId,
      name,
      subject,
      saveLocation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      activePageId: pageId,
      pages: [newPage],
      strokes: {},
      theme: 'blackboard',
    };

    setWorkspace(prev => ({
      activeBatchId: batchId,
      batches: [...prev.batches, newBatch],
    }));

    setTransform({ x: 0, y: 0, zoom: 1 });
  }, []);

  const handleSelectBatch = useCallback((batchId: string) => {
    setWorkspace(prev => ({
      ...prev,
      activeBatchId: batchId,
    }));
    setTransform({ x: 0, y: 0, zoom: 1 });
  }, []);

  const handleDeleteBatch = useCallback((batchId: string) => {
    setWorkspace(prev => {
      if (prev.batches.length <= 1) return prev;
      const remaining = prev.batches.filter(b => b.id !== batchId);
      const nextActiveId = prev.activeBatchId === batchId ? remaining[0].id : prev.activeBatchId;
      return {
        activeBatchId: nextActiveId,
        batches: remaining,
      };
    });
  }, []);

  const handleDuplicateBatch = useCallback((batchId: string) => {
    const sourceBatch = workspace.batches.find(b => b.id === batchId);
    if (!sourceBatch) return;

    const newBatchId = `batch_${Date.now()}`;
    const newBatch: Batch = {
      ...sourceBatch,
      id: newBatchId,
      name: `${sourceBatch.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setWorkspace(prev => ({
      activeBatchId: newBatchId,
      batches: [...prev.batches, newBatch],
    }));
  }, [workspace.batches]);

  // Trigger Share Modal for specific page or batch
  const handleOpenShareForPage = useCallback((page: WhiteboardPage) => {
    setShareTargetPage(page);
    setIsShareModalOpen(true);
  }, []);

  const handleOpenShareBatch = useCallback(() => {
    setShareTargetPage(null);
    setIsShareModalOpen(true);
  }, []);

  const handleImportDocument = useCallback((importedDoc: WhiteboardDocument) => {
    const newBatchId = `batch_${Date.now()}`;
    const importedBatch: Batch = {
      id: newBatchId,
      name: importedDoc.title || 'Imported Lesson',
      subject: 'Imported Topics',
      createdAt: importedDoc.createdAt || Date.now(),
      updatedAt: Date.now(),
      activePageId: importedDoc.activePageId || importedDoc.pages[0]?.id || 'page_1',
      pages: importedDoc.pages || [],
      strokes: importedDoc.strokes || {},
      theme: importedDoc.theme || 'blackboard',
    };

    setWorkspace(prev => ({
      activeBatchId: newBatchId,
      batches: [...prev.batches, importedBatch],
    }));
  }, []);

  // Keyboard Navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        handleRedo();
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'e') {
        handleOpenShareBatch();
        e.preventDefault();
      } else if (isCmdOrCtrl && (e.key === '=' || e.key === '+')) {
        handleZoomIn();
        e.preventDefault();
      } else if (isCmdOrCtrl && (e.key === '-' || e.key === '_')) {
        handleZoomOut();
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key === '0') {
        handleResetZoom();
        e.preventDefault();
      } else if (isCmdOrCtrl && e.key === '9') {
        handleFitToContent();
        e.preventDefault();
      } else if (e.key === 'PageUp' || (isCmdOrCtrl && e.key === '[')) {
        const idx = activeBatch.pages.findIndex(p => p.id === activePage.id);
        if (idx > 0) handleSelectPage(activeBatch.pages[idx - 1].id);
        e.preventDefault();
      } else if (e.key === 'PageDown' || (isCmdOrCtrl && e.key === ']')) {
        const idx = activeBatch.pages.findIndex(p => p.id === activePage.id);
        if (idx < activeBatch.pages.length - 1) handleSelectPage(activeBatch.pages[idx + 1].id);
        e.preventDefault();
      } else if (!isCmdOrCtrl && (e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        if (e.key.toLowerCase() === 'p') setTool('pen');
        if (e.key.toLowerCase() === 'e') setTool('stroke-eraser');
        if (e.key.toLowerCase() === 'h') setTool('pan');
        if (e.key.toLowerCase() === 'c') handleToggleCodeHighlight();
        if (e.key.toLowerCase() === 't') setIsTextBoxTypeModalOpen(true);
        if (e.key.toLowerCase() === 's') setTool('shape');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToContent,
    activeBatch.pages,
    activePage.id,
    handleSelectPage,
    handleOpenShareBatch,
    handleAddTextBox,
  ]);

  const currentTheme = activeBatch.theme || 'blackboard';
  const currentThemeConfig = currentTheme === 'whiteboard' ? WHITEBOARD_THEME : BLACKBOARD_THEME;
  const currentHistory = history[activePage.id] || [];
  const currentRedo = redoStack[activePage.id] || [];

  // Active document representation for export
  const activeDocumentForExport: WhiteboardDocument = {
    id: activeBatch.id,
    title: `${activeBatch.name} - ${activeBatch.subject || 'Lesson'}`,
    version: 1,
    createdAt: activeBatch.createdAt,
    updatedAt: activeBatch.updatedAt,
    theme: currentTheme,
    activePageId: activePage.id,
    pages: activeBatch.pages,
    strokes: activeBatch.strokes || {},
    textElements: activeBatch.textElements || {},
  };

  return (
    <div
      className={`w-full h-full flex flex-col select-none overflow-hidden theme-${currentTheme}`}
      style={{
        backgroundColor: currentThemeConfig.backgroundColor,
        color: currentThemeConfig.textColor,
      }}
    >
      {/* Sleek Custom Electron Titlebar */}
      <TitleBar
        boardTitle={activePage.title}
        batchName={activeBatch.name}
        theme={currentTheme}
        onThemeToggle={toggleTheme}
        onOpenShare={handleOpenShareBatch}
        onOpenBatchManager={() => setIsBatchManagerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewPage={() => setIsNewPageModalOpen(true)}
        onOpenDrawer={() => setIsPageDrawerOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        saveStatus={saveStatus}
      />

      {/* New Page Topic Prompt Modal */}
      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
        onCreatePage={handleCreatePageWithTopic}
        pageNumber={activeBatch.pages.length + 1}
        theme={currentTheme}
      />

      {/* Batches & Classes Manager Modal */}
      <BatchManagerModal
        isOpen={isBatchManagerOpen}
        onClose={() => setIsBatchManagerOpen(false)}
        batches={workspace.batches}
        activeBatchId={workspace.activeBatchId}
        onSelectBatch={handleSelectBatch}
        onCreateBatch={handleCreateBatch}
        onDeleteBatch={handleDeleteBatch}
        onDuplicateBatch={handleDuplicateBatch}
        onExportBatch={b => {
          setWorkspace(prev => ({ ...prev, activeBatchId: b.id }));
          setIsBatchManagerOpen(false);
          handleOpenShareBatch();
        }}
        theme={currentTheme}
      />

      {/* Export & Share Modal (Single Page or Entire Batch) */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={activeDocumentForExport}
        activePage={shareTargetPage || activePage}
        strokes={activeBatch.strokes || {}}
        textElements={activeBatch.textElements || {}}
        theme={currentTheme}
        onImportDocument={handleImportDocument}
      />

      {/* Main Infinite Canvas Workspace */}
      <main className="flex-1 relative overflow-hidden">
        {/* Floating Page Navigation HUD (Top-Left) */}
        <PageNavigationHUD
          pages={activeBatch.pages}
          activePageId={activePage.id}
          onSelectPage={handleSelectPage}
          onAddPage={() => setIsNewPageModalOpen(true)}
          onOpenDrawer={() => setIsPageDrawerOpen(true)}
          theme={currentTheme}
        />

        {/* Slide-out Page Drawer */}
        <PageDrawer
          isOpen={isPageDrawerOpen}
          onClose={() => setIsPageDrawerOpen(false)}
          batch={activeBatch}
          pages={activeBatch.pages}
          activePageId={activePage.id}
          strokes={activeBatch.strokes || {}}
          onSelectPage={handleSelectPage}
          onPromptAddPage={() => setIsNewPageModalOpen(true)}
          onRenamePage={handleRenamePage}
          onDuplicatePage={handleDuplicatePage}
          onDeletePage={handleDeletePage}
          onReorderPages={handleReorderPages}
          onSharePage={handleOpenShareForPage}
          onShareBatch={handleOpenShareBatch}
          onOpenBatchManager={() => setIsBatchManagerOpen(true)}
          theme={currentTheme}
        />

        {/* Infinite Multi-Layer Whiteboard Canvas */}
        <WhiteboardCanvas
          pageId={activePage.id}
          theme={currentTheme}
          currentTool={tool}
          currentColor={color}
          currentWidth={currentWidth}
          strokes={currentStrokes}
          onStrokeComplete={handleStrokeComplete}
          onSelectColor={setColor}
          transform={transform}
          onTransformChange={setTransform}
          onCanvasSizeChange={handleCanvasSizeChange}
          activeShapeType={activeShapeType}
          isAutoSnapEnabled={isAutoSnapEnabled}
        />

        {/* Movable Text & Code Boxes (Drag anywhere, toggle Code vs Text) */}
        {currentTextElements.map(elem => (
          <MovableTextBox
            key={elem.id}
            element={elem}
            transform={transform}
            theme={currentTheme}
            isSelected={selectedTextId === elem.id}
            onSelect={() => setSelectedTextId(elem.id)}
            onChange={handleUpdateTextBox}
            onDelete={handleDeleteTextBox}
          />
        ))}

        {/* Interactive Minimap Navigator (Toggled in Settings / Preferences) */}
        {settings.showNavigation && (
          <Minimap
            strokes={currentStrokes}
            transform={transform}
            onTransformChange={setTransform}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            theme={currentTheme}
          />
        )}

        {/* Floating Inking & Navigation Toolbar */}
        <Toolbar
          tool={tool}
          onSelectTool={handleSelectTool}
          color={color}
          onSelectColor={setColor}
          width={currentWidth}
          onSelectWidth={handleSelectWidth}
          theme={currentTheme}
          onToggleTheme={toggleTheme}
          canUndo={currentHistory.length > 0}
          canRedo={currentRedo.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClear}
          zoom={transform.zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onFitToContent={handleFitToContent}
          isCodeHighlightActive={isCodeHighlightActive}
          onToggleCodeHighlight={handleToggleCodeHighlight}
          onOpenModelTrainer={() => setIsModelTrainerOpen(true)}
          onAddTextBox={() => setIsTextBoxTypeModalOpen(true)}
          activeShapeType={activeShapeType}
          onSelectShapeType={setActiveShapeType}
          isAutoSnapEnabled={isAutoSnapEnabled}
          onToggleAutoSnap={() => handleUpdateSettings({ autoSnapShapes: !settings.autoSnapShapes })}
          isPinned={settings.pinPenToolbar}
          onTogglePin={() => handleUpdateSettings({ pinPenToolbar: !settings.pinPenToolbar })}
        />

        {/* Modal: Choose Code Box vs Normal Text Box */}
        <TextBoxTypeModal
          isOpen={isTextBoxTypeModalOpen}
          onClose={() => setIsTextBoxTypeModalOpen(false)}
          onSelectType={mode => {
            setIsTextBoxTypeModalOpen(false);
            handleAddTextBox(mode);
          }}
          theme={currentTheme}
        />

        {/* Model Trainer Studio Modal */}
        <ModelTrainerModal
          isOpen={isModelTrainerOpen}
          onClose={() => setIsModelTrainerOpen(false)}
          theme={currentTheme}
        />

        {/* User Preferences & App Settings Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          theme={currentTheme}
        />

        {/* Startup Loading Screen */}
        {showLoadingScreen && (
          <LoadingScreen fadingOut={isLoadingFadingOut} />
        )}
      </main>
    </div>
  );
};
