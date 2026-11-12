import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from '../components/layout/TitleBar';
import { WhiteboardCanvas } from '../components/canvas/WhiteboardCanvas';
import { Toolbar } from '../components/toolbar/Toolbar';
import { Minimap } from '../components/minimap/Minimap';
import { PageNavigationHUD } from '../components/pages/PageNavigationHUD';
import { PageDrawer } from '../components/pages/PageDrawer';
import { NewPageModal } from '../components/pages/NewPageModal';
import { BatchesAndFilesDrawer } from '../components/batches/BatchesAndFilesDrawer';
import { ShareModal } from '../components/export/ShareModal';
import {
  AppWorkspace,
  Batch,
  BoardThemeType,
  ImageElement,
  Stroke,
  StrokeTool,
  ShapeType,
  TextBoxElement,
  ViewportTransform,
  WhiteboardDocument,
  WhiteboardPage,
} from '../types/whiteboard';
import { BLACKBOARD_THEME } from '../types/theme';
import { CanvasController } from '../core/canvas/CanvasController';
import { StorageManager } from '../core/storage/StorageManager';
import { SyntaxHighlighterEngine } from '../core/syntax/SyntaxHighlighterEngine';
import { ContextAwareSyntaxEngine } from '../core/syntax/ContextAwareSyntaxEngine';
import { ModelTrainerModal } from '../components/syntax/ModelTrainerModal';
import { MovableTextBox } from '../components/canvas/MovableTextBox';
import { MovableImage } from '../components/canvas/MovableImage';
import { TextBoxTypeModal } from '../components/canvas/TextBoxTypeModal';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { SavingOverlay } from '../components/common/SavingOverlay';
import { SettingsModal, AppSettings } from '../components/common/SettingsModal';
import { FloatingBoardOverlay } from '../components/canvas/FloatingBoardOverlay';
import { UpdateNotificationToast } from '../components/common/UpdateNotificationToast';
import { useAutosave } from '../hooks/useAutosave';
import { useClipboardPaste } from '../hooks/useClipboardPaste';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export const App: React.FC = () => {
  // --- Workspace & Batches State ---
  const [workspace, setWorkspace] = useState<AppWorkspace>(() =>
    StorageManager.createInitialWorkspace()
  );

  const activeBatch =
    workspace.batches.find(b => b.id === workspace.activeBatchId) || workspace.batches[0];

  const activePage =
    activeBatch.pages.find(p => p.id === activeBatch.activePageId) || activeBatch.pages[0];

  // Tool Selection State
  const [tool, setTool] = useState<StrokeTool>('pen');

  // Persistence Refs & Autosave Hook
  const isLoadedRef = useRef(false);
  const workspaceRef = useRef<AppWorkspace>(workspace);
  workspaceRef.current = workspace;

  const {
    saveStatus,
    setSaveStatus,
    savingTitle,
    savingDetail,
    isExiting,
    handleManualSave,
    handleAppClose,
  } = useAutosave({
    workspace,
    workspaceRef,
    isLoadedRef,
  });

  // Modals & Drawers State
  const [isPageDrawerOpen, setIsPageDrawerOpen] = useState(false);
  const [isNewPageModalOpen, setIsNewPageModalOpen] = useState(false);
  const [isBatchesDrawerOpen, setIsBatchesDrawerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetPage, setShareTargetPage] = useState<WhiteboardPage | null>(null);
  const [isModelTrainerOpen, setIsModelTrainerOpen] = useState(false);
  const [isTextBoxTypeModalOpen, setIsTextBoxTypeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Undocked / Picture-in-Picture Floating Board State
  const [isFloatingBoard, setIsFloatingBoard] = useState<boolean>(false);
  const [_isEdgeCollapsed, setIsEdgeCollapsed] = useState<boolean>(false);

  const handleCollapseToEdge = useCallback(async () => {
    if (window.smartBoardAPI?.collapseToEdge) {
      await window.smartBoardAPI.collapseToEdge();
      setIsEdgeCollapsed(true);
    }
  }, []);

  const handleToggleFloatingBoard = useCallback(async () => {
    if (!isFloatingBoard) {
      if (window.smartBoardAPI?.undockToFloating) {
        await window.smartBoardAPI.undockToFloating();
      }
      setIsFloatingBoard(true);
      setIsEdgeCollapsed(false);
    } else {
      if (window.smartBoardAPI?.dockToFull) {
        await window.smartBoardAPI.dockToFull();
      }
      setIsFloatingBoard(false);
      setIsEdgeCollapsed(false);
    }
  }, [isFloatingBoard]);

  useEffect(() => {
    const unsubEdgeExpanded = window.smartBoardAPI?.onEdgeExpanded?.(() => {
      setIsEdgeCollapsed(false);
      setIsFloatingBoard(true);
    });
    const unsubToggleFloating = window.smartBoardAPI?.onToggleFloating?.(() => {
      handleToggleFloatingBoard();
    });
    const unsubCollapseEdge = window.smartBoardAPI?.onTriggerCollapseToEdge?.(() => {
      handleCollapseToEdge();
    });
    return () => {
      unsubEdgeExpanded?.();
      unsubToggleFloating?.();
      unsubCollapseEdge?.();
    };
  }, [handleToggleFloatingBoard, handleCollapseToEdge]);

  // App User Preferences & Settings (Persisted in localStorage)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('thunderboard_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          autoIconGeneration: true,
          showNavigation: true,
          pinPenToolbar: localStorage.getItem('smartboard_toolbar_pinned') === 'true',
          autoSnapShapes: false,
          quickTapGestures: true,
          ...parsed,
        };
      }
    } catch (e) {
      console.error(e);
    }
    return {
      autoIconGeneration: true,
      showNavigation: true,
      pinPenToolbar: localStorage.getItem('smartboard_toolbar_pinned') === 'true',
      autoSnapShapes: false,
      quickTapGestures: true,
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

  // Drawing Tools State & Per-Tool Size Memory
  const [color, setColor] = useState<string>(BLACKBOARD_THEME.penColors[0].value);
  const [toolSizes, setToolSizes] = useState<Record<StrokeTool, number>>({
    pen: 4,
    pencil: 2,
    highlighter: 18,
    'stroke-eraser': 2,
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

  // Track last active inking tool so toggling from eraser restores pen/pencil/highlighter
  const lastPenToolRef = useRef<StrokeTool>('pen');

  useEffect(() => {
    if (tool !== 'stroke-eraser' && tool !== 'select' && tool !== 'pan' && tool !== 'shape' && tool !== 'text') {
      lastPenToolRef.current = tool;
    }
  }, [tool]);

  // Triple-Click Gesture: Toggle Pen <-> Eraser (and vice versa)
  const handleTogglePenEraser = useCallback(() => {
    setTool(prevTool => {
      if (prevTool === 'stroke-eraser') {
        return lastPenToolRef.current || 'pen';
      } else {
        lastPenToolRef.current = prevTool;
        return 'stroke-eraser';
      }
    });
  }, []);

  // Double-Click Gesture: Cycle Active Pen Color through the palette
  const handleCycleColor = useCallback(() => {
    const colors = BLACKBOARD_THEME.penColors;
    if (!colors || colors.length === 0) return;

    // If currently using eraser, switch to drawing tool
    if (tool === 'stroke-eraser') {
      setTool(lastPenToolRef.current || 'pen');
    }

    setColor(prevColor => {
      const currentIndex = colors.findIndex(c => c.value.toLowerCase() === prevColor.toLowerCase());
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % colors.length;
      return colors[nextIndex].value;
    });
  }, [activeBatch.theme, tool]);

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

  // --- Movable Image Elements (Pasted from Clipboard Ctrl+V / Snipping Tool) ---
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);
  const currentImageElements = Object.values(activeBatch.imageElements || {}).filter(
    img => img.pageId === activePage.id
  );
  const lastPasteTimeRef = useRef(0);
  const lastPasteLengthRef = useRef(0);

  // Paste / Add Image Element
  const handlePasteImage = useCallback(
    (dataUrl: string) => {
      if (!dataUrl || !dataUrl.startsWith('data:image/')) return;
      const now = Date.now();
      if (now - lastPasteTimeRef.current < 600 && Math.abs(dataUrl.length - lastPasteLengthRef.current) < 50) {
        return; // Ignore duplicate paste triggered in rapid succession
      }
      lastPasteTimeRef.current = now;
      lastPasteLengthRef.current = dataUrl.length;

      const img = new Image();
      img.onload = () => {
        const naturalW = img.naturalWidth || 400;
        const naturalH = img.naturalHeight || 300;

        // Scale comfortably within current viewport (max 650w, 450h)
        const maxInitialW = Math.min(650, canvasSize.width * 0.7);
        const maxInitialH = Math.min(450, canvasSize.height * 0.7);
        const scaleRatio = Math.min(1, maxInitialW / naturalW, maxInitialH / naturalH);

        const initialW = Math.max(100, Math.round(naturalW * scaleRatio));
        const initialH = Math.max(60, Math.round(naturalH * scaleRatio));

        // Position at center of current viewport
        const worldCenterX = Math.round((-transform.x + (canvasSize.width / 2) - (initialW / 2)) / transform.zoom);
        const worldCenterY = Math.round((-transform.y + (canvasSize.height / 2) - (initialH / 2)) / transform.zoom);

        const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newImgElem: ImageElement = {
          id,
          pageId: activePage.id,
          x: worldCenterX,
          y: worldCenterY,
          width: initialW,
          height: initialH,
          src: dataUrl,
          isFixed: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setWorkspace(prev => {
          const nextBatches = prev.batches.map(b => {
            if (b.id !== prev.activeBatchId) return b;
            return {
              ...b,
              imageElements: {
                ...(b.imageElements || {}),
                [id]: newImgElem,
              },
              updatedAt: Date.now(),
            };
          });
          return { ...prev, batches: nextBatches };
        });

        setSelectedImageId(id);
      };
      img.src = dataUrl;
    },
    [activePage.id, transform, canvasSize]
  );

  const handleUpdateImage = useCallback((updated: ImageElement) => {
    setWorkspace(prev => {
      const nextBatches = prev.batches.map(b => {
        if (b.id !== prev.activeBatchId) return b;
        return {
          ...b,
          imageElements: {
            ...(b.imageElements || {}),
            [updated.id]: updated,
          },
          updatedAt: Date.now(),
        };
      });
      return { ...prev, batches: nextBatches };
    });
  }, []);

  const handleDeleteImage = useCallback((id: string) => {
    setWorkspace(prev => {
      const nextBatches = prev.batches.map(b => {
        if (b.id !== prev.activeBatchId) return b;
        const remaining = { ...(b.imageElements || {}) };
        delete remaining[id];
        return {
          ...b,
          imageElements: remaining,
          updatedAt: Date.now(),
        };
      });
      return { ...prev, batches: nextBatches };
    });
    setSelectedImageId(null);
  }, []);

  const handleDuplicateImage = useCallback((source: ImageElement) => {
    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const duplicate: ImageElement = {
      ...source,
      id,
      x: source.x + 30,
      y: source.y + 30,
      isFixed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setWorkspace(prev => {
      const nextBatches = prev.batches.map(b => {
        if (b.id !== prev.activeBatchId) return b;
        return {
          ...b,
          imageElements: {
            ...(b.imageElements || {}),
            [id]: duplicate,
          },
          updatedAt: Date.now(),
        };
      });
      return { ...prev, batches: nextBatches };
    });
    setSelectedImageId(id);
  }, []);

  // Fix (Commit) all active images into the canvas background on loose focus / drawing
  const handleFixImages = useCallback(() => {
    setSelectedImageId(null);
    setWorkspace(prev => {
      const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId);
      if (!currentBatchObj || !currentBatchObj.imageElements) return prev;
      let changed = false;
      const updatedImages = { ...currentBatchObj.imageElements };
      for (const [id, img] of Object.entries(updatedImages)) {
        if (!img.isFixed) {
          updatedImages[id] = { ...img, isFixed: true, updatedAt: Date.now() };
          changed = true;
        }
      }
      if (!changed) return prev;
      const nextBatches = prev.batches.map(b =>
        b.id === prev.activeBatchId ? { ...b, imageElements: updatedImages, updatedAt: Date.now() } : b
      );
      return { ...prev, batches: nextBatches };
    });
  }, []);

  // Toggle Image Fix state (Double-click image to unlock for editing if needed)
  const handleToggleImageFix = useCallback((id: string) => {
    setWorkspace(prev => {
      const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId);
      if (!currentBatchObj || !currentBatchObj.imageElements || !currentBatchObj.imageElements[id]) return prev;
      const targetImg = currentBatchObj.imageElements[id];
      const nextFixed = !targetImg.isFixed;
      const updatedImages = {
        ...currentBatchObj.imageElements,
        [id]: { ...targetImg, isFixed: nextFixed, updatedAt: Date.now() },
      };
      if (!nextFixed) {
        setSelectedImageId(id);
      } else {
        setSelectedImageId(null);
      }
      const nextBatches = prev.batches.map(b =>
        b.id === prev.activeBatchId ? { ...b, imageElements: updatedImages, updatedAt: Date.now() } : b
      );
      return { ...prev, batches: nextBatches };
    });
  }, []);

  // Global Clipboard Image Paste Listener
  useClipboardPaste({ onPasteImage: handlePasteImage });

  // Load Workspace from Storage on Mount with Smooth Loading Screen
  useEffect(() => {
    const initLoad = async () => {
      const startTime = Date.now();
      const loaded = await StorageManager.loadWorkspace();
      if (loaded && loaded.batches && loaded.batches.length > 0) {
        let validActiveId = loaded.activeBatchId;
        if (!loaded.batches.some(b => b.id === validActiveId)) {
          validActiveId = loaded.batches[0].id;
        }
        const validated: AppWorkspace = {
          activeBatchId: validActiveId,
          batches: loaded.batches,
        };
        workspaceRef.current = validated;
        setWorkspace(validated);
        setSaveStatus('saved');
      }
      isLoadedRef.current = true;

      // Fast, snappy transition to canvas without artificial delay
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 150 - elapsed);
      setTimeout(() => {
        setIsLoadingFadingOut(true);
        setTimeout(() => {
          setShowLoadingScreen(false);
        }, 200);
      }, remaining);
    };

    initLoad();
  }, []);

  // Track whether an active real-time eraser swipe is in progress (for single undo snapshot)
  const isErasingGestureRef = useRef(false);

  // Real-Time Eraser: Erases strokes instantly as the eraser crosses them with zero lag
  const handleEraseStrokes = useCallback((strokeIds: string[]) => {
    if (!strokeIds || strokeIds.length === 0) return;
    const pageId = activePage.id;

    setWorkspace(prev => {
      const currentBatchObj = prev.batches.find(b => b.id === prev.activeBatchId) || prev.batches[0];

      // On first stroke hit of this continuous gesture, snapshot for undo
      if (!isErasingGestureRef.current) {
        isErasingGestureRef.current = true;
        const currentList = Object.values(currentBatchObj.strokes || {}).filter(
          s => s.pageId === pageId && !s.isErased
        );
        setHistory(h => ({
          ...h,
          [pageId]: [...(h[pageId] || []), currentList].slice(-30),
        }));
        setRedoStack(r => ({
          ...r,
          [pageId]: [],
        }));
      }

      const updatedStrokes = { ...(currentBatchObj.strokes || {}) };
      let changed = false;
      for (const id of strokeIds) {
        if (updatedStrokes[id] && !updatedStrokes[id].isErased) {
          updatedStrokes[id] = { ...updatedStrokes[id], isErased: true };
          changed = true;
        }
      }

      if (!changed) return prev;

      const nextBatches = prev.batches.map(b =>
        b.id === prev.activeBatchId
          ? { ...b, strokes: updatedStrokes, updatedAt: Date.now() }
          : b
      );
      return { ...prev, batches: nextBatches };
    });
  }, [activePage.id]);

  const handleEraseEnd = useCallback(() => {
    isErasingGestureRef.current = false;
  }, []);

  // Commit a newly drawn stroke to active batch
  const handleStrokeComplete = useCallback(
    (stroke: Stroke) => {
      handleFixImages();
      const pageId = activePage.id;

      if (stroke.tool === 'stroke-eraser') {
        // Fallback bounding box eraser
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
          [pageId]: [...(h[pageId] || []), currentList].slice(-30),
        }));
        setRedoStack(r => ({
          ...r,
          [pageId]: [],
        }));

        const updatedStrokes: Record<string, Stroke> = {
          ...(currentBatchObj.strokes || {}),
          [stroke.id]: stroke,
        };

        // In-Place Handwritten Syntax Highlighting (Predefined Model + Underline + Context-Aware)
        if (isCodeHighlightActive && stroke.tool !== 'stroke-eraser') {
          const currentTheme = currentBatchObj.theme || 'blackboard';
          const pageStrokes = Object.values(updatedStrokes).filter(
            s => s.pageId === pageId && !s.isErased && s.tool !== 'stroke-eraser'
          );

          // 1. Check for Underline Gesture (Underline a handwritten word to highlight it)
          const underlineMatch = SyntaxHighlighterEngine.detectUnderlineGesture(stroke, pageStrokes);
          if (underlineMatch) {
            const { targetCluster } = underlineMatch;
            const clusterStrokes = targetCluster.strokeIds
              .map(id => updatedStrokes[id])
              .filter(Boolean);

            const contextResult = ContextAwareSyntaxEngine.analyzeWithContext(
              targetCluster,
              clusterStrokes,
              pageStrokes
            );
            const detected =
              contextResult?.tokenType ||
              SyntaxHighlighterEngine.detectSymbolInStrokes(clusterStrokes) ||
              'keyword';

            const palette = SyntaxHighlighterEngine.applySyntaxHighlighting(
              updatedStrokes,
              currentTheme,
              targetCluster.strokeIds.map(id => ({ strokeId: id, tokenType: detected }))
            );
            Object.assign(updatedStrokes, palette.updatedStrokes);
          } else {
            // 2. High-Performance Targeted Recognition (only evaluates cluster touched by the stroke)
            const clusters = SyntaxHighlighterEngine.clusterStrokesIntoWords(pageStrokes);
            const activeCluster = clusters.find(c => c.strokeIds.includes(stroke.id));
            if (activeCluster) {
              const clusterStrokes = activeCluster.strokeIds
                .map(id => updatedStrokes[id])
                .filter(Boolean);

              const contextResult = ContextAwareSyntaxEngine.analyzeWithContext(
                activeCluster,
                clusterStrokes,
                pageStrokes
              );

              if (contextResult) {
                const palette = SyntaxHighlighterEngine.applySyntaxHighlighting(
                  updatedStrokes,
                  currentTheme,
                  activeCluster.strokeIds.map(id => ({ strokeId: id, tokenType: contextResult.tokenType }))
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
    [activePage.id, isCodeHighlightActive, handleFixImages]
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
      currentTextElements,
      currentImageElements
    );
    setTransform(next);
  }, [currentStrokes, canvasSize, currentTextElements, currentImageElements]);

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

    setWorkspace(prev => {
      const next: AppWorkspace = {
        activeBatchId: batchId,
        batches: [...prev.batches, newBatch],
      };
      workspaceRef.current = next;
      // Fast non-blocking save
      StorageManager.flushImmediate(next, { generateHtml: false });
      return next;
    });

    setTransform({ x: 0, y: 0, zoom: 1 });
  }, []);

  // Instant Batch Switching (0ms UI latency, background async persist)
  const handleSelectBatch = useCallback((batchId: string) => {
    if (batchId === workspaceRef.current.activeBatchId) return;

    // 1. Immediately switch active batch in React state (0ms latency!)
    setWorkspace(prev => {
      const next = { ...prev, activeBatchId: batchId };
      workspaceRef.current = next;
      return next;
    });
    setTransform({ x: 0, y: 0, zoom: 1 });

    // 2. Persist activeBatchId asynchronously in background without blocking UI
    setSaveStatus('saving');
    StorageManager.saveWorkspaceImmediate(workspaceRef.current, { generateHtml: false }).then(success => {
      setSaveStatus(success ? 'saved' : 'unsaved');
    });
  }, []);

  const handleDeleteBatch = useCallback((batchId: string) => {
    setWorkspace(prev => {
      if (prev.batches.length <= 1) return prev;
      const remaining = prev.batches.filter(b => b.id !== batchId);
      const nextActiveId = prev.activeBatchId === batchId ? remaining[0].id : prev.activeBatchId;
      const next: AppWorkspace = {
        activeBatchId: nextActiveId,
        batches: remaining,
      };
      workspaceRef.current = next;

      // Physically purge deleted batch from disk and cache so it NEVER resurrects
      StorageManager.deleteBatch(batchId);
      StorageManager.flushImmediate(next, { generateHtml: false });
      return next;
    });
  }, []);

  const handleDuplicateBatch = useCallback((batchId: string) => {
    setWorkspace(prev => {
      const sourceBatch = prev.batches.find(b => b.id === batchId);
      if (!sourceBatch) return prev;

      const newBatchId = `batch_${Date.now()}`;
      const newBatch: Batch = {
        ...sourceBatch,
        id: newBatchId,
        name: `${sourceBatch.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const next: AppWorkspace = {
        activeBatchId: newBatchId,
        batches: [...prev.batches, newBatch],
      };
      workspaceRef.current = next;
      StorageManager.flushImmediate(next, { generateHtml: false });
      return next;
    });
  }, []);

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

    setWorkspace(prev => {
      const next: AppWorkspace = {
        activeBatchId: newBatchId,
        batches: [...prev.batches, importedBatch],
      };
      workspaceRef.current = next;
      StorageManager.flushImmediate(next, { generateHtml: false });
      return next;
    });
  }, []);

  // Load a lesson file directly from disk into the whiteboard
  const handleLoadLessonFileFromPath = useCallback(
    async (filePath: string) => {
      try {
        if (!window.smartBoardAPI?.readFilePath) return;
        const res = await window.smartBoardAPI.readFilePath(filePath);
        if (!res.success || !res.content) {
          console.error('Failed to read file:', res.error);
          return;
        }
        const data = JSON.parse(res.content);
        // Case 1: AppWorkspace file
        if (data.batches && Array.isArray(data.batches)) {
          setWorkspace(prev => {
            const existingIds = new Set(prev.batches.map(b => b.id));
            const toAdd = data.batches.filter((b: Batch) => !existingIds.has(b.id));
            const newBatches = [...prev.batches, ...toAdd];
            const nextActiveId = data.activeBatchId || (toAdd[0] ? toAdd[0].id : prev.activeBatchId);
            const next: AppWorkspace = {
              activeBatchId: nextActiveId,
              batches: newBatches.length > 0 ? newBatches : prev.batches,
            };
            workspaceRef.current = next;
            StorageManager.flushImmediate(next, { generateHtml: false });
            return next;
          });
        }
        // Case 2: Single WhiteboardDocument
        else if (data.pages && Array.isArray(data.pages)) {
          handleImportDocument(data as WhiteboardDocument);
        }
      } catch (err) {
        console.error('Error loading lesson file:', err);
      }
    },
    [handleImportDocument]
  );

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    handleUndo,
    handleRedo,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToContent,
    pages: activeBatch.pages,
    activePageId: activePage.id,
    handleSelectPage,
    handleOpenShareBatch,
    handleManualSave,
    handleToggleFloatingBoard,
    handleCollapseToEdge,
    isFloatingBoard,
    setTool,
    handleToggleCodeHighlight,
    setIsTextBoxTypeModalOpen,
  });

  const currentTheme: BoardThemeType = 'blackboard';
  const currentThemeConfig = BLACKBOARD_THEME;
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
    imageElements: activeBatch.imageElements || {},
  };

  // Dedicated Undocked / Picture-in-Picture Floating Mode (Pure Canvas, No Clutter, Shortcut Driven)
  if (isFloatingBoard) {
    return (
      <div
        className={`w-full h-full relative select-none overflow-hidden theme-${currentTheme}`}
        style={{
          backgroundColor: currentThemeConfig.backgroundColor,
          color: currentThemeConfig.textColor,
        }}
      >
        {/* Sleek Minimal Floating Header: Move handle on left, Tuck + Pin + Close on right */}
        <FloatingBoardOverlay
          theme={currentTheme}
          onClose={handleToggleFloatingBoard}
          onCollapseToEdge={handleCollapseToEdge}
        />

        {/* 100% Pure Whiteboard Canvas with NO controls */}
        <div className="w-full h-full relative">
          <WhiteboardCanvas
            pageId={activePage.id}
            theme={currentTheme}
            currentTool={tool}
            currentColor={color}
            currentWidth={currentWidth}
            strokes={currentStrokes}
            onStrokeComplete={handleStrokeComplete}
            onEraseStrokes={handleEraseStrokes}
            onEraseEnd={handleEraseEnd}
            onSelectColor={setColor}
            transform={transform}
            onTransformChange={setTransform}
            onCanvasSizeChange={handleCanvasSizeChange}
            activeShapeType={activeShapeType}
            isAutoSnapEnabled={isAutoSnapEnabled}
            images={currentImageElements}
            onHoverImage={setHoveredImageId}
            onPointerDownCanvas={handleFixImages}
            onToggleImageFix={handleToggleImageFix}
            isClickGesturesEnabled={settings.quickTapGestures}
            onCycleColor={handleCycleColor}
            onTogglePenEraser={handleTogglePenEraser}
          >
            {/* Movable & Resizable Pasted Images */}
            {currentImageElements.map(img => (
              <MovableImage
                key={img.id}
                element={img}
                transform={transform}
                theme={currentTheme}
                isSelected={selectedImageId === img.id}
                isHovered={hoveredImageId === img.id}
                onSelect={() => {
                  setSelectedImageId(img.id);
                  setSelectedTextId(null);
                }}
                onChange={handleUpdateImage}
                onDelete={handleDeleteImage}
                onDuplicate={handleDuplicateImage}
              />
            ))}
          </WhiteboardCanvas>

          {/* Movable Text Elements */}
          {currentTextElements.map(elem => (
            <MovableTextBox
              key={elem.id}
              element={elem}
              transform={transform}
              theme={currentTheme}
              isSelected={selectedTextId === elem.id}
              onSelect={() => {
                setSelectedTextId(elem.id);
                setSelectedImageId(null);
              }}
              onChange={handleUpdateTextBox}
              onDelete={handleDeleteTextBox}
            />
          ))}
        </div>

        {/* Saving Loading Animation Overlay */}
        <SavingOverlay
          isSaving={saveStatus === 'saving'}
          isExiting={isExiting}
          title={savingTitle}
          detail={savingDetail}
        />
      </div>
    );
  }

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
        batches={workspace.batches}
        activeBatchId={workspace.activeBatchId}
        onSelectBatch={handleSelectBatch}
        onOpenBatchesDrawer={() => setIsBatchesDrawerOpen(true)}
        theme={currentTheme}
        onOpenShare={handleOpenShareBatch}
        onOpenBatchManager={() => setIsBatchesDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNewPage={() => setIsNewPageModalOpen(true)}
        onOpenDrawer={() => setIsPageDrawerOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        saveStatus={saveStatus}
        onSave={handleManualSave}
        onClose={handleAppClose}
        onUndockBoard={handleToggleFloatingBoard}
      />

      {/* New Page Topic Prompt Modal */}
      <NewPageModal
        isOpen={isNewPageModalOpen}
        onClose={() => setIsNewPageModalOpen(false)}
        onCreatePage={handleCreatePageWithTopic}
        pageNumber={activeBatch.pages.length + 1}
        theme={currentTheme}
      />

      {/* Batches & Files Library Drawer (Dedicated Hub for all Batches and Saved Files on PC) */}
      <BatchesAndFilesDrawer
        isOpen={isBatchesDrawerOpen}
        onClose={() => setIsBatchesDrawerOpen(false)}
        batches={workspace.batches}
        activeBatchId={workspace.activeBatchId}
        onSelectBatch={handleSelectBatch}
        onCreateBatch={handleCreateBatch}
        onDeleteBatch={handleDeleteBatch}
        onDuplicateBatch={handleDuplicateBatch}
        onExportBatch={b => {
          setWorkspace(prev => ({ ...prev, activeBatchId: b.id }));
          setIsBatchesDrawerOpen(false);
          handleOpenShareBatch();
        }}
        onLoadFileToBoard={handleLoadLessonFileFromPath}
        onImportFromFile={async () => {
          if (window.smartBoardAPI) {
            const res = await window.smartBoardAPI.importFile();
            if (!res.canceled && res.content) {
              try {
                const doc = JSON.parse(res.content);
                handleImportDocument(doc);
              } catch (e) {
                console.error('Error importing file:', e);
              }
            }
          }
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
        imageElements={activeBatch.imageElements || {}}
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
          onOpenBatchManager={() => setIsBatchesDrawerOpen(true)}
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
          onEraseStrokes={handleEraseStrokes}
          onEraseEnd={handleEraseEnd}
          onSelectColor={setColor}
          transform={transform}
          onTransformChange={setTransform}
          onCanvasSizeChange={handleCanvasSizeChange}
          activeShapeType={activeShapeType}
          isAutoSnapEnabled={isAutoSnapEnabled}
          images={currentImageElements}
          onHoverImage={setHoveredImageId}
          onPointerDownCanvas={handleFixImages}
          onToggleImageFix={handleToggleImageFix}
          isClickGesturesEnabled={settings.quickTapGestures}
          onCycleColor={handleCycleColor}
          onTogglePenEraser={handleTogglePenEraser}
        >
          {/* Movable & Resizable Pasted Images (Rendered underneath ink strokes so stylus/pen draws directly on top!) */}
          {currentImageElements.map(img => (
            <MovableImage
              key={img.id}
              element={img}
              transform={transform}
              theme={currentTheme}
              isSelected={selectedImageId === img.id}
              isHovered={hoveredImageId === img.id}
              onSelect={() => {
                setSelectedImageId(img.id);
                setSelectedTextId(null);
              }}
              onChange={handleUpdateImage}
              onDelete={handleDeleteImage}
              onDuplicate={handleDuplicateImage}
            />
          ))}
        </WhiteboardCanvas>

        {/* Movable Text & Code Boxes (Drag anywhere, toggle Code vs Text) */}
        {currentTextElements.map(elem => (
          <MovableTextBox
            key={elem.id}
            element={elem}
            transform={transform}
            theme={currentTheme}
            isSelected={selectedTextId === elem.id}
            onSelect={() => {
              setSelectedTextId(elem.id);
              setSelectedImageId(null);
            }}
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
          onUndockBoard={handleToggleFloatingBoard}
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

        {/* Saving Loading Animation Overlay (HUD or Modal) */}
        <SavingOverlay
          isSaving={saveStatus === 'saving'}
          isExiting={isExiting}
          title={savingTitle}
          detail={savingDetail}
        />

        {/* Startup Loading Screen */}
        {showLoadingScreen && (
          <LoadingScreen fadingOut={isLoadingFadingOut} />
        )}

        {/* Auto-Updater Live Toast Notification */}
        <UpdateNotificationToast onOpenSettings={() => setIsSettingsOpen(true)} />
      </main>
    </div>
  );
};
