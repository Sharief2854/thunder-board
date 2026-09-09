import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pin, X, Check, Copy } from 'lucide-react';

interface VsCodeColorPickerProps {
  color: string;
  onChangeColor: (hexColor: string) => void;
  pinnedColors: string[];
  onTogglePinColor: (hexColor: string) => void;
  onUnpinColor: (hexColor: string, e: React.MouseEvent) => void;
  onClearPinnedColors: () => void;
  isDark?: boolean;
  maxPinnedColors?: number;
}

// 24 Curated Vibrant Solid Presets
const EXTENDED_PALETTE = [
  '#f87171', '#ef4444', '#dc2626', '#f43f5e', '#ec4899', '#d946ef',
  '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4',
  '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b',
  '#f97316', '#ea580c', '#ffffff', '#94a3b8', '#64748b', '#000000',
];

// Color conversion helpers
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return { r: 59, g: 130, b: 246 }; // default blue
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;

  let h = 0;
  if (diff !== 0) {
    if (max === rNorm) {
      h = ((gNorm - bNorm) / diff) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / diff + 2;
    } else {
      h = (rNorm - gNorm) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : diff / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rP = 0, gP = 0, bP = 0;

  if (h >= 0 && h < 60) {
    rP = c; gP = x; bP = 0;
  } else if (h >= 60 && h < 120) {
    rP = x; gP = c; bP = 0;
  } else if (h >= 120 && h < 180) {
    rP = 0; gP = c; bP = x;
  } else if (h >= 180 && h < 240) {
    rP = 0; gP = x; bP = c;
  } else if (h >= 240 && h < 300) {
    rP = x; gP = 0; bP = c;
  } else {
    rP = c; gP = 0; bP = x;
  }

  return {
    r: Math.round((rP + m) * 255),
    g: Math.round((gP + m) * 255),
    b: Math.round((bP + m) * 255),
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    if (max === rNorm) {
      h = ((gNorm - bNorm) / diff) % 6;
    } else if (max === gNorm) {
      h = (bNorm - rNorm) / diff + 2;
    } else {
      h = (rNorm - gNorm) / diff + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

export const VsCodeColorPicker: React.FC<VsCodeColorPickerProps> = ({
  color,
  onChangeColor,
  pinnedColors,
  onTogglePinColor,
  onUnpinColor,
  onClearPinnedColors,
  isDark = true,
  maxPinnedColors = 4,
}) => {
  // Format mode: 'hex' | 'rgb' | 'hsl' (similar to VS Code top bar click)
  const [formatMode, setFormatMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [copied, setCopied] = useState(false);

  // Maintain internal HSV state
  const [hsv, setHsv] = useState<{ h: number; s: number; v: number }>(() => {
    const rgb = hexToRgb(color);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });

  const [hexInput, setHexInput] = useState(color);

  // Sync when external color changes
  useEffect(() => {
    const currentHex = rgbToHex(
      ...Object.values(hsvToRgb(hsv.h, hsv.s, hsv.v)) as [number, number, number]
    );
    if (color.toLowerCase() !== currentHex.toLowerCase()) {
      const rgb = hexToRgb(color);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      setHexInput(color);
    }
  }, [color]);

  const svBoxRef = useRef<HTMLDivElement>(null);
  const isDraggingSv = useRef(false);

  const hueBarRef = useRef<HTMLDivElement>(null);
  const isDraggingHue = useRef(false);

  // Update SV from pointer coordinates
  const updateSvFromPointer = useCallback((clientX: number, clientY: number) => {
    if (!svBoxRef.current) return;
    const rect = svBoxRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const newS = x;
    const newV = 1 - y;

    setHsv(prev => {
      const next = { ...prev, s: newS, v: newV };
      const { r, g, b } = hsvToRgb(next.h, next.s, next.v);
      const newHex = rgbToHex(r, g, b);
      setHexInput(newHex);
      onChangeColor(newHex);
      return next;
    });
  }, [onChangeColor]);

  // Update Hue from pointer coordinates
  const updateHueFromPointer = useCallback((clientX: number) => {
    if (!hueBarRef.current) return;
    const rect = hueBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newHue = Math.round(x * 360) % 360;

    setHsv(prev => {
      const next = { ...prev, h: newHue };
      const { r, g, b } = hsvToRgb(next.h, next.s, next.v);
      const newHex = rgbToHex(r, g, b);
      setHexInput(newHex);
      onChangeColor(newHex);
      return next;
    });
  }, [onChangeColor]);

  // Pointer event handlers for SV Box
  const handleSvPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingSv.current = true;
    updateSvFromPointer(e.clientX, e.clientY);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (isDraggingSv.current) {
        updateSvFromPointer(moveEvent.clientX, moveEvent.clientY);
      }
    };

    const onPointerUp = () => {
      isDraggingSv.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Pointer event handlers for Hue Slider
  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isDraggingHue.current = true;
    updateHueFromPointer(e.clientX);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (isDraggingHue.current) {
        updateHueFromPointer(moveEvent.clientX);
      }
    };

    const onPointerUp = () => {
      isDraggingHue.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      const rgb = hexToRgb(val);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
      onChangeColor(val);
    }
  };

  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hsl = rgbToHsl(r, g, b);
  const currentHex = rgbToHex(r, g, b);

  // Formatted string based on mode
  const getDisplayValue = () => {
    switch (formatMode) {
      case 'rgb':
        return `rgb(${r}, ${g}, ${b})`;
      case 'hsl':
        return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
      case 'hex':
      default:
        return currentHex.toUpperCase();
    }
  };

  const cycleFormat = () => {
    if (formatMode === 'hex') setFormatMode('rgb');
    else if (formatMode === 'rgb') setFormatMode('hsl');
    else setFormatMode('hex');
  };

  const handleCopyColor = () => {
    navigator.clipboard.writeText(getDisplayValue());
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const isColorPinned = pinnedColors.some(c => c.toLowerCase() === currentHex.toLowerCase());

  return (
    <div className="w-[280px] flex flex-col select-none text-xs">
      {/* 1. VS Code Saturation-Value 2D Area (SV Box) */}
      <div
        ref={svBoxRef}
        onPointerDown={handleSvPointerDown}
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
        }}
        className="relative w-full h-36 rounded-xl overflow-hidden cursor-crosshair shadow-inner"
      >
        {/* Horizontal White gradient (Saturation: 0% -> 100%) */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, #ffffff, rgba(255, 255, 255, 0))',
          }}
        />
        {/* Vertical Black gradient (Value / Brightness: 100% -> 0%) */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0), #000000)',
          }}
        />

        {/* Reticle / Circular Thumb */}
        <div
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: currentHex,
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.8)] pointer-events-none transition-transform active:scale-125"
        />
      </div>

      {/* 2. Controls Row: Hue Slider Bar */}
      <div className="mt-3 px-0.5">
        <div className="flex items-center justify-between text-[10px] opacity-60 font-semibold mb-1">
          <span>HUE</span>
          <span>{hsv.h}°</span>
        </div>
        <div
          ref={hueBarRef}
          onPointerDown={handleHuePointerDown}
          className="relative w-full h-3.5 rounded-lg cursor-pointer shadow-inner"
          style={{
            background:
              'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          }}
        >
          {/* Draggable Hue thumb */}
          <div
            style={{
              left: `${(hsv.h / 360) * 100}%`,
              backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
            }}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.6)] pointer-events-none"
          />
        </div>
      </div>

      {/* 3. VS Code Header Bar: Swatch Preview + Format Switcher + Pin Button */}
      <div
        className={`mt-3 p-2 rounded-xl border flex items-center justify-between gap-2 ${
          isDark ? 'bg-slate-950/60 border-white/10' : 'bg-slate-100 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          {/* Color Preview Swatch */}
          <div
            style={{ backgroundColor: currentHex }}
            className="w-7 h-7 rounded-lg border border-black/20 dark:border-white/30 shadow-xs flex-shrink-0"
          />

          {/* Format Toggle Pill (click to cycle HEX -> RGB -> HSL) */}
          <button
            onClick={cycleFormat}
            title="Click to toggle format (HEX / RGB / HSL)"
            className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold uppercase hover:bg-blue-500/30 transition-colors"
          >
            {formatMode}
          </button>

          {/* Value Display / Editable Hex */}
          {formatMode === 'hex' ? (
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              maxLength={7}
              placeholder="#FFFFFF"
              className="w-20 bg-black/20 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase border border-current/15 focus:outline-none focus:border-blue-500 text-center"
            />
          ) : (
            <span
              onClick={handleCopyColor}
              className="font-mono text-[10.5px] font-semibold cursor-pointer truncate max-w-[110px]"
              title="Click to copy formatted color"
            >
              {getDisplayValue()}
            </span>
          )}

          {/* Quick Copy Icon */}
          <button
            onClick={handleCopyColor}
            title="Copy color value"
            className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded opacity-60 hover:opacity-100"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {/* Pin to Toolbar Button */}
        {(() => {
          const isAtLimit = !isColorPinned && pinnedColors.length >= maxPinnedColors;
          return (
            <button
              onClick={() => {
                if (isAtLimit) return;
                onTogglePinColor(currentHex);
              }}
              disabled={isAtLimit}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-semibold transition-all border ${
                isColorPinned
                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30'
                  : isAtLimit
                  ? 'bg-black/5 dark:bg-white/5 opacity-50 cursor-not-allowed border-current/10 text-slate-400'
                  : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 border-current/15 opacity-85 hover:opacity-100'
              }`}
              title={
                isColorPinned
                  ? 'Pinned to Toolbar (Click to unpin)'
                  : isAtLimit
                  ? `Limit reached (${pinnedColors.length}/${maxPinnedColors}). Unpin a color below to pin this one.`
                  : `Pin this custom color to toolbar (${pinnedColors.length}/${maxPinnedColors})`
              }
            >
              <Pin className={`w-3 h-3 ${isColorPinned ? 'fill-current' : ''}`} />
              <span>{isColorPinned ? 'Pinned' : isAtLimit ? `Full (${maxPinnedColors})` : 'Pin'}</span>
            </button>
          );
        })()}
      </div>

      {/* 4. Curated 24-Color Palette Grid */}
      <div className="mt-3">
        <div className="text-[10px] font-semibold opacity-60 mb-1.5 flex items-center justify-between">
          <span>Palette</span>
          <span className="text-[9px] opacity-40">24 Vibrant Colors</span>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {EXTENDED_PALETTE.map(c => {
            const isSelected = currentHex.toLowerCase() === c.toLowerCase();
            const isPinned = pinnedColors.some(pc => pc.toLowerCase() === c.toLowerCase());
            return (
              <button
                key={c}
                onClick={() => {
                  const rgb = hexToRgb(c);
                  setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                  setHexInput(c);
                  onChangeColor(c);
                }}
                title={`${c}${isPinned ? ' (Pinned to Toolbar)' : ''}`}
                style={{ backgroundColor: c }}
                className={`h-6 rounded-md border transition-all relative flex items-center justify-center ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-400/50 scale-105 shadow-md'
                    : 'border-black/20 dark:border-white/20 hover:scale-105'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white drop-shadow" />}
                {isPinned && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Pinned Colors on Toolbar List */}
      {pinnedColors.length > 0 && (
        <div className="mt-3 pt-2 border-t border-current/10">
          <div className="flex items-center justify-between text-[10px] font-semibold opacity-60 mb-1.5">
            <span>
              Pinned to Toolbar ({pinnedColors.length}/{maxPinnedColors})
            </span>
            <button
              onClick={onClearPinnedColors}
              className="text-[9px] text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
            {pinnedColors.map(pc => {
              const isSelected = currentHex.toLowerCase() === pc.toLowerCase();
              return (
                <div
                  key={pc}
                  className={`flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-lg border text-[10px] font-mono ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 font-bold'
                      : 'bg-black/5 dark:bg-white/5 border-current/10'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20 dark:border-white/20 cursor-pointer"
                    style={{ backgroundColor: pc }}
                    onClick={() => {
                      const rgb = hexToRgb(pc);
                      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                      setHexInput(pc);
                      onChangeColor(pc);
                    }}
                  />
                  <span
                    className="cursor-pointer"
                    onClick={() => {
                      const rgb = hexToRgb(pc);
                      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
                      setHexInput(pc);
                      onChangeColor(pc);
                    }}
                  >
                    {pc.toUpperCase()}
                  </span>
                  <button
                    onClick={e => onUnpinColor(pc, e)}
                    title="Unpin"
                    className="p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded text-slate-400 hover:text-red-400"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
