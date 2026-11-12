import React, { useState, useEffect } from 'react';
import { GripHorizontal, Pin, PinOff, X, ArrowLeftToLine, ArrowRightToLine } from 'lucide-react';
import { BoardThemeType } from '../../types/whiteboard';

interface FloatingBoardOverlayProps {
  theme?: BoardThemeType;
  onClose: () => void;
  onCollapseToEdge?: () => void;
}

export const FloatingBoardOverlay: React.FC<FloatingBoardOverlayProps> = ({
  theme: _theme = 'blackboard',
  onClose,
  onCollapseToEdge,
}) => {
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? document.hasFocus() : true;
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isTouchFocused, setIsTouchFocused] = useState<boolean>(false);

  const [isRightSide, setIsRightSide] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.screen) {
      const screenLeft = (window.screen as any).availLeft || 0;
      const mid = window.screenX + window.innerWidth / 2;
      return mid > (screenLeft + window.screen.availWidth / 2);
    }
    return false;
  });

  const [placement, setPlacement] = useState<'top' | 'bottom'>(() => {
    if (typeof window !== 'undefined' && window.screen) {
      const mid = window.screenY + window.innerHeight / 2;
      return mid < window.screen.availHeight / 2 ? 'bottom' : 'top';
    }
    return 'top';
  });

  // Track Window Focus and Blur (both native DOM and Electron IPC)
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
      setIsHovered(false);
      setIsTouchFocused(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Listen to native Electron window focus & blur (100% reliable on OS app switching)
    const unsubFocus = window.smartBoardAPI?.onWindowFocus?.(handleFocus);
    const unsubBlur = window.smartBoardAPI?.onWindowBlur?.(handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      unsubFocus?.();
      unsubBlur?.();
    };
  }, []);

  // Hover anywhere on the board window to display controls
  useEffect(() => {
    const handleMouseMove = () => {
      if (document.hasFocus()) {
        setIsHovered(true);
      }
      if (typeof window !== 'undefined' && window.screen) {
        const screenLeft = (window.screen as any).availLeft || 0;
        const mid = window.screenX + window.innerWidth / 2;
        setIsRightSide(mid > (screenLeft + window.screen.availWidth / 2));
      }
    };

    const handleMouseEnter = () => {
      if (document.hasFocus()) {
        setIsHovered(true);
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // In Electron / Chromium, entering a -webkit-app-region: drag element emits a pseudo mouseleave.
      // If cursor coordinates are still physically inside the window, do NOT unhover!
      if (
        e.clientX > 0 &&
        e.clientX < window.innerWidth &&
        e.clientY > 0 &&
        e.clientY < window.innerHeight
      ) {
        return;
      }
      setIsHovered(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Touch focus anywhere on the board
  useEffect(() => {
    const handlePointerDown = () => {
      if (document.hasFocus()) {
        setIsTouchFocused(true);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  // Track Always on top and dynamic vertical placement
  useEffect(() => {
    if (window.smartBoardAPI?.isAlwaysOnTop) {
      window.smartBoardAPI.isAlwaysOnTop().then(setIsAlwaysOnTop);
    }

    if (window.smartBoardAPI?.getVerticalPlacement) {
      window.smartBoardAPI.getVerticalPlacement().then(pos => {
        if (pos) setPlacement(pos);
      });
    }

    if (window.smartBoardAPI?.onVerticalPlacementChanged) {
      const cleanup = window.smartBoardAPI.onVerticalPlacementChanged(newPlacement => {
        setPlacement(newPlacement);
      });
      return cleanup;
    }
  }, []);

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.smartBoardAPI?.toggleAlwaysOnTop) {
      const state = await window.smartBoardAPI.toggleAlwaysOnTop();
      setIsAlwaysOnTop(state);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  // Display buttons if window is focused AND (hovered anywhere or touch-focused)
  // If window loses focus (e.g. user clicks another app), isWindowFocused is false -> immediately hidden!
  const isVisible = isWindowFocused && (isHovered || isTouchFocused);
  const isBottom = placement === 'bottom';

  return (
    <div
      className={`absolute inset-x-0 ${
        isBottom ? 'bottom-0' : 'top-0'
      } pointer-events-none z-50 flex items-center justify-between p-2.5 select-none`}
    >
      {/* Left Side: Drag Handle Icon (Text removed, Fixed Size, No Scaling) */}
      <div
        className={`flex items-center justify-center p-1.5 rounded-md shadow-lg cursor-grab active:cursor-grabbing border backdrop-blur-md transition-opacity duration-150 ease-out ${
          isVisible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        } bg-slate-900/95 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white shadow-black/60`}
        style={{ WebkitAppRegion: isVisible ? 'drag' : 'no-drag' } as React.CSSProperties}
        onMouseEnter={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        title="Click and drag to move board anywhere on screen"
      >
        <GripHorizontal className="w-4 h-4 text-slate-400 hover:text-slate-200" />
      </div>

      {/* Right Side: Tuck, Pin, and Close Buttons (Fixed Size, No Scaling) */}
      <div
        className={`flex items-center gap-0.5 rounded-md p-0.5 border shadow-lg backdrop-blur-md transition-opacity duration-150 ease-out ${
          isVisible
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        } bg-slate-900/95 border-slate-700/80 text-slate-300 shadow-black/60`}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Tuck to Screen Edge (Samsung Edge Panel) */}
        {onCollapseToEdge && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onCollapseToEdge();
            }}
            className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 transition-colors"
            title={isRightSide ? "Tuck to Right Screen Edge (Ctrl+E / Alt+E / Ctrl+Shift+E)" : "Tuck to Left Screen Edge (Ctrl+E / Alt+E / Ctrl+Shift+E)"}
          >
            {isRightSide ? (
              <ArrowRightToLine className="w-3.5 h-3.5" />
            ) : (
              <ArrowLeftToLine className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Pin Option (Always on Top toggle) */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleTogglePin}
          className={`p-1 rounded transition-colors ${
            isAlwaysOnTop
              ? 'text-amber-400 hover:bg-amber-400/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
          title={isAlwaysOnTop ? 'Pin is ON (Always on top)' : 'Pin is OFF (Click to pin on top)'}
        >
          {isAlwaysOnTop ? <Pin className="w-3.5 h-3.5 fill-current" /> : <PinOff className="w-3.5 h-3.5" />}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
          title="Close / Dock Back to Main Window (Esc / Ctrl+D / Ctrl+Shift+D)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
