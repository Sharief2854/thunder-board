import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Layers,
  BrainCircuit,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Stroke, BoardThemeType } from '../../types/whiteboard';
import { HandwritingModelTrainer, TrainingSample } from '../../core/syntax/HandwritingModelTrainer';
import { SyntaxTokenType, SYNTAX_PALETTE } from '../../core/syntax/SyntaxHighlighterEngine';
import { StrokeBuilder } from '../../core/inking/StrokeBuilder';
import { Smoother } from '../../core/inking/Smoother';

interface ModelTrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: BoardThemeType;
}

interface DefaultTokenCategory {
  category: string;
  tokens: { token: string; type: SyntaxTokenType; desc: string }[];
}

const PRESET_CATEGORIES: DefaultTokenCategory[] = [
  {
    category: 'Python Keywords',
    tokens: [
      { token: 'def', type: 'keyword', desc: 'Function Definition' },
      { token: 'class', type: 'keyword', desc: 'Class Definition' },
      { token: 'return', type: 'keyword', desc: 'Return Statement' },
      { token: 'if', type: 'keyword', desc: 'Conditional If' },
      { token: 'for', type: 'keyword', desc: 'For Loop' },
      { token: 'while', type: 'keyword', desc: 'While Loop' },
      { token: 'import', type: 'keyword', desc: 'Module Import' },
    ],
  },
  {
    category: 'JavaScript & Web',
    tokens: [
      { token: 'function', type: 'keyword', desc: 'JS Function' },
      { token: 'const', type: 'keyword', desc: 'Constant Variable' },
      { token: 'let', type: 'keyword', desc: 'Block Scoped Variable' },
      { token: 'async', type: 'keyword', desc: 'Asynchronous Function' },
      { token: 'await', type: 'keyword', desc: 'Await Promise' },
    ],
  },
  {
    category: 'Braces & Brackets',
    tokens: [
      { token: '{', type: 'operator', desc: 'Open Curly Brace' },
      { token: '}', type: 'operator', desc: 'Closing Curly Brace' },
      { token: '(', type: 'operator', desc: 'Open Parenthesis' },
      { token: ')', type: 'operator', desc: 'Closing Parenthesis' },
      { token: '[', type: 'operator', desc: 'Open Square Bracket' },
      { token: ']', type: 'operator', desc: 'Closing Square Bracket' },
    ],
  },
  {
    category: 'Operators & Arrows',
    tokens: [
      { token: '=>', type: 'operator', desc: 'Arrow Function' },
      { token: '->', type: 'operator', desc: 'Return Type Arrow' },
      { token: '==', type: 'operator', desc: 'Equality Operator' },
      { token: '!=', type: 'operator', desc: 'Not Equal' },
      { token: '=', type: 'operator', desc: 'Assignment Operator' },
      { token: '+', type: 'operator', desc: 'Plus Operator' },
      { token: '//', type: 'comment', desc: 'Comment Slashes' },
      { token: '#', type: 'comment', desc: 'Hash Comment' },
    ],
  },
  {
    category: 'HTML & XML Tags',
    tokens: [
      { token: '<', type: 'tag', desc: 'Left Angle Bracket' },
      { token: '>', type: 'tag', desc: 'Right Angle Bracket' },
      { token: '</', type: 'tag', desc: 'Closing Tag Prefix' },
      { token: '<div>', type: 'tag', desc: 'Div Element' },
      { token: '</div>', type: 'tag', desc: 'Closing Div' },
      { token: '<span>', type: 'tag', desc: 'Span Element' },
    ],
  },
  {
    category: 'Values & Booleans',
    tokens: [
      { token: 'true', type: 'boolean', desc: 'Boolean True' },
      { token: 'false', type: 'boolean', desc: 'Boolean False' },
      { token: 'null', type: 'boolean', desc: 'Null / None Value' },
    ],
  },
];

export const ModelTrainerModal: React.FC<ModelTrainerModalProps> = ({
  isOpen,
  onClose,
  theme,
}) => {
  const [selectedToken, setSelectedToken] = useState<string>('{');
  const [selectedTokenType, setSelectedTokenType] = useState<SyntaxTokenType>('operator');
  const [customInput, setCustomInput] = useState<string>('');

  const trainer = HandwritingModelTrainer.getInstance();
  const [samples, setSamples] = useState<TrainingSample[]>([]);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recordedStrokes, setRecordedStrokes] = useState<Stroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);
  const activeBuilderRef = useRef<StrokeBuilder | null>(null);

  // Live test sandbox state
  const [testResult, setTestResult] = useState<{
    token: string;
    type: SyntaxTokenType;
    confidence: number;
    isCustom?: boolean;
  } | null>(null);

  const isDark = theme === 'blackboard' || theme === 'chalkboard';
  const palette = SYNTAX_PALETTE[theme] || SYNTAX_PALETTE.blackboard;

  const refreshSamples = useCallback(() => {
    setSamples(trainer.getSamples());
  }, [trainer]);

  useEffect(() => {
    if (isOpen) {
      refreshSamples();
      clearTrainingCanvas();
    }
  }, [isOpen, refreshSamples]);

  // Clear mini training canvas
  const clearTrainingCanvas = () => {
    setRecordedStrokes([]);
    setTestResult(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Redraw committed strokes on the training canvas
  const redrawTrainingCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of recordedStrokes) {
      Smoother.renderStroke(ctx, stroke.points, 'pen', stroke.color, stroke.width);
    }
  }, [recordedStrokes]);

  useEffect(() => {
    redrawTrainingCanvas();
  }, [redrawTrainingCanvas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const rect = target.getBoundingClientRect();

    const strokeColor = palette[selectedTokenType] || '#c084fc';
    const builder = new StrokeBuilder('train_page', 'pen', strokeColor, 4);
    builder.addPointFromEvent(e.nativeEvent, rect, { x: 0, y: 0, zoom: 1 });

    activeBuilderRef.current = builder;
    isDrawingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeBuilderRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    activeBuilderRef.current.addPointFromEvent(e.nativeEvent, rect, { x: 0, y: 0, zoom: 1 });

    // Draw active stroke on canvas live
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const strokeColor = palette[selectedTokenType] || '#c084fc';
        const livePts = activeBuilderRef.current.getPoints();
        if (livePts.length >= 2) {
          Smoother.renderStroke(ctx, livePts, 'pen', strokeColor, 4);
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeBuilderRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const completed = activeBuilderRef.current.build();
    isDrawingRef.current = false;
    activeBuilderRef.current = null;

    if (completed) {
      const nextStrokes = [...recordedStrokes, completed];
      setRecordedStrokes(nextStrokes);

      // Perform live classification test on input
      const match = trainer.classify(nextStrokes, 0.40);
      if (match) {
        setTestResult({
          token: match.token,
          type: match.type,
          confidence: Math.round(match.score * 100),
          isCustom: match.isCustom,
        });
      } else {
        setTestResult(null);
      }
    }
  };

  // Save new sample
  const handleSaveSample = () => {
    if (recordedStrokes.length === 0) return;
    trainer.addSample(selectedToken, selectedTokenType, recordedStrokes);
    refreshSamples();
    clearTrainingCanvas();
  };

  // Delete sample
  const handleDeleteSample = (id: string) => {
    trainer.removeSample(id);
    refreshSamples();
  };

  // Reset to factory predefined
  const handleResetToPredefined = () => {
    if (window.confirm('Reset all models to factory predefined defaults? This will remove custom training samples.')) {
      trainer.resetToPredefined();
      refreshSamples();
      clearTrainingCanvas();
    }
  };

  // Add custom token
  const handleAddCustomToken = () => {
    if (!customInput.trim()) return;
    const clean = customInput.trim();
    setSelectedToken(clean);
    setSelectedTokenType('keyword');
    setCustomInput('');
  };

  if (!isOpen) return null;

  const currentTokenSamples = samples.filter(s => s.token === selectedToken);
  const customSamplesCount = samples.filter(s => !s.isPredefined).length;
  const predefinedSamplesCount = samples.filter(s => s.isPredefined).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-xl shadow-2xl border flex flex-col overflow-hidden max-h-[92vh] ${
          isDark
            ? 'bg-slate-900 border-white/10 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-current/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-sm">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Handwriting Recognition & Syntax Model Studio
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Predefined Ready
                </span>
              </h2>
              <p className="text-xs opacity-60">
                Predefined models are active for all languages out of the box. Train your personal handwriting style anytime for extra precision.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Tokens to Train */}
          <div className="w-80 border-r border-current/10 p-4 flex flex-col gap-4 overflow-y-auto bg-black/5 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Available Tokens
              </label>
              <button
                onClick={handleResetToPredefined}
                title="Reset all to factory predefined defaults"
                className="text-[10px] flex items-center gap-1 text-purple-400 hover:text-purple-300 opacity-80 hover:opacity-100 transition-opacity"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Reset Factory Defaults
              </button>
            </div>

            <div className="space-y-4">
              {PRESET_CATEGORIES.map(cat => (
                <div key={cat.category}>
                  <span className="text-[11px] font-mono text-purple-400 font-semibold">
                    {cat.category}
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {cat.tokens.map(t => {
                      const tokenSamples = samples.filter(s => s.token === t.token);
                      const hasPredefined = tokenSamples.some(s => s.isPredefined);
                      const customCount = tokenSamples.filter(s => !s.isPredefined).length;
                      const isSelected = selectedToken === t.token;

                      return (
                        <button
                          key={t.token}
                          onClick={() => {
                            setSelectedToken(t.token);
                            setSelectedTokenType(t.type);
                            clearTrainingCanvas();
                          }}
                          className={`px-2.5 py-2 rounded-xl font-mono text-xs font-bold flex items-center justify-between border transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/30 scale-[1.02]'
                              : 'bg-black/5 dark:bg-white/5 border-current/10 opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                        >
                          <span className="truncate mr-1">{t.token}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasPredefined && (
                              <span
                                title="Predefined built-in model active"
                                className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                              />
                            )}
                            {customCount > 0 && (
                              <span
                                title={`${customCount} custom user sample(s) trained`}
                                className="text-[9px] px-1 py-0.2 rounded-full bg-purple-500/40 text-purple-200 border border-purple-400/40 font-mono"
                              >
                                +{customCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Token Adder */}
            <div className="pt-3 border-t border-current/10">
              <label className="text-[11px] font-mono uppercase tracking-wider opacity-70">
                Train Any Custom Symbol / Keyword
              </label>
              <div className="flex gap-1.5 mt-1.5">
                <input
                  type="text"
                  placeholder="e.g. static, async, =>"
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCustomToken()}
                  className="flex-1 px-3 py-1.5 rounded-xl text-xs font-mono bg-black/10 dark:bg-white/10 border border-current/15 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleAddCustomToken}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Center & Right: Drawing Pad & Trained Samples */}
          <div className="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
            {/* Active Training Status Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-mono text-2xl font-bold text-purple-300">
                  {selectedToken}
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    Token: <span className="font-mono text-purple-400">{selectedToken}</span>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md text-white font-semibold"
                      style={{ backgroundColor: palette[selectedTokenType] || '#7c3aed' }}
                    >
                      {selectedTokenType}
                    </span>
                  </h3>
                  <p className="text-xs opacity-70 mt-0.5">
                    {currentTokenSamples.some(s => s.isPredefined)
                      ? 'Predefined built-in template is active. Draw below if you want to teach your specific handwriting.'
                      : 'Draw this symbol 1 to 3 times below to register your handwriting.'}
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="text-emerald-400 font-bold">
                  {currentTokenSamples.filter(s => !s.isPredefined).length}
                </span>{' '}
                custom samples
              </div>
            </div>

            {/* Interactive Drawing Pad */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-medium opacity-80">
                <span>Draw your symbol / keyword below:</span>
                {testResult && (
                  <span className="font-mono text-purple-400 flex items-center gap-1.5 bg-purple-500/15 px-2.5 py-1 rounded-md border border-purple-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    Recognized: <strong>{testResult.token}</strong> ({testResult.confidence}% match)
                    {testResult.isCustom && <span className="text-[10px] text-emerald-400 font-sans">(Custom Trained)</span>}
                  </span>
                )}
              </div>

              <div
                className={`relative h-60 rounded-xl border border-dashed flex items-center justify-center overflow-hidden touch-none ${
                  isDark
                    ? 'bg-slate-950/80 border-purple-500/30 shadow-inner'
                    : 'bg-slate-50 border-purple-500/30 shadow-inner'
                }`}
              >
                {/* Horizontal Baseline / Guide Lines */}
                <div className="absolute inset-0 pointer-events-none opacity-15 flex flex-col justify-around py-8">
                  <div className="w-full border-b border-purple-400 border-dashed" />
                  <div className="w-full border-b-2 border-purple-500" />
                  <div className="w-full border-b border-purple-400 border-dashed" />
                </div>

                {recordedStrokes.length === 0 && (
                  <div className="absolute pointer-events-none text-center opacity-30 select-none">
                    <span className="text-3xl font-mono block font-bold">{selectedToken}</span>
                    <span className="text-xs">Draw here with pen or mouse</span>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  width={600}
                  height={240}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="w-full h-full cursor-crosshair touch-none"
                />
              </div>

              {/* Pad Controls */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={clearTrainingCanvas}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-current/15 hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Pad
                </button>

                <button
                  onClick={handleSaveSample}
                  disabled={recordedStrokes.length === 0}
                  className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                    recordedStrokes.length > 0
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30 scale-102 cursor-pointer'
                      : 'bg-slate-700/50 opacity-40 cursor-not-allowed shadow-none'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Custom Handwriting Sample
                </button>
              </div>
            </div>

            {/* Registered Samples for this Token */}
            <div className="pt-2 border-t border-current/10">
              <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">
                Templates & Samples for &apos;{selectedToken}&apos; ({currentTokenSamples.length})
              </h4>
              <div className="grid grid-cols-3 gap-2.5">
                {currentTokenSamples.map((sample, idx) => (
                  <div
                    key={sample.id}
                    className={`p-3 rounded-xl border flex items-center justify-between group ${
                      sample.isPredefined
                        ? 'border-emerald-500/30 bg-emerald-500/10'
                        : 'border-purple-500/30 bg-purple-500/10'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-mono font-bold flex items-center gap-1">
                        {sample.isPredefined ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            Predefined
                          </>
                        ) : (
                          `Sample #${idx + 1}`
                        )}
                      </span>
                      <span className="text-[10px] block opacity-60 font-mono">
                        {sample.strokeCount || 1} stroke(s) • ratio: {Math.round((sample.aspectRatio || 1) * 10) / 10}
                      </span>
                    </div>

                    {!sample.isPredefined && (
                      <button
                        onClick={() => handleDeleteSample(sample.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete custom sample"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-current/10 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-3 text-xs opacity-75">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>
              Predefined Templates: <strong className="text-emerald-400">{predefinedSamplesCount}</strong> • Custom User Samples: <strong className="text-purple-400">{customSamplesCount}</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-500/25"
          >
            Done & Return to Board
          </button>
        </div>
      </div>
    </div>
  );
};
