import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Layers,
  BrainCircuit,
} from 'lucide-react';
import { Stroke, BoardThemeType } from '../../types/whiteboard';
import { HandwritingModelTrainer, TrainingSample } from '../../core/syntax/HandwritingModelTrainer';
import { SyntaxTokenType } from '../../core/syntax/SyntaxHighlighterEngine';
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
    category: 'HTML & XML Tags',
    tokens: [
      { token: '<', type: 'tag', desc: 'Left Angle Bracket' },
      { token: '>', type: 'tag', desc: 'Right Angle Bracket' },
      { token: '<div>', type: 'tag', desc: 'Div Element' },
      { token: '</div>', type: 'tag', desc: 'Closing Div' },
      { token: '<span>', type: 'tag', desc: 'Span Element' },
      { token: '</p>', type: 'tag', desc: 'Closing Paragraph' },
    ],
  },
  {
    category: 'Keywords & Operators',
    tokens: [
      { token: 'def', type: 'keyword', desc: 'Python Function Def' },
      { token: 'class', type: 'keyword', desc: 'Class Keyword' },
      { token: 'return', type: 'keyword', desc: 'Return Statement' },
      { token: 'function', type: 'keyword', desc: 'JS Function' },
      { token: '=>', type: 'operator', desc: 'Arrow Function' },
      { token: '//', type: 'comment', desc: 'Comment Slashes' },
      { token: '#', type: 'comment', desc: 'Python Hash Comment' },
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
  } | null>(null);

  const isDark = theme === 'blackboard' || theme === 'chalkboard';

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

    const builder = new StrokeBuilder('train_page', 'pen', '#c084fc', 4);
    builder.addCoalescedEvents(e.nativeEvent, rect, { x: 0, y: 0, zoom: 1 });
    activeBuilderRef.current = builder;
    isDrawingRef.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeBuilderRef.current) return;
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    activeBuilderRef.current.addCoalescedEvents(e.nativeEvent, rect, { x: 0, y: 0, zoom: 1 });

    // Live preview
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        redrawTrainingCanvas();
        const pts = activeBuilderRef.current.getPoints();
        Smoother.renderStroke(ctx, pts, 'pen', '#c084fc', 4);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !activeBuilderRef.current) return;
    const target = e.currentTarget;
    try {
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch {}

    const rect = target.getBoundingClientRect();
    activeBuilderRef.current.addCoalescedEvents(e.nativeEvent, rect, { x: 0, y: 0, zoom: 1 });
    const finalStroke = activeBuilderRef.current.build();

    activeBuilderRef.current = null;
    isDrawingRef.current = false;

    if (finalStroke) {
      const nextList = [...recordedStrokes, finalStroke];
      setRecordedStrokes(nextList);

      // Real-time live classification test
      const match = trainer.classify(nextList, 0.35);
      if (match) {
        setTestResult({
          token: match.token,
          type: match.type,
          confidence: Math.round(match.score * 100),
        });
      } else {
        setTestResult(null);
      }
    }
  };

  // Save current drawing as a training sample for the active token
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

  // Add custom token
  const handleAddCustomToken = () => {
    if (!customInput.trim()) return;
    setSelectedToken(customInput.trim());
    setSelectedTokenType('keyword');
    setCustomInput('');
  };

  if (!isOpen) return null;

  const currentTokenSamples = samples.filter(s => s.token === selectedToken);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-4xl rounded-3xl shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh] ${
          isDark
            ? 'bg-slate-900 border-white/15 text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200 text-slate-800 shadow-[0_24px_60px_rgba(0,0,0,0.2)]'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-current/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Handwriting Model Trainer Studio
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Custom AI
                </span>
              </h2>
              <p className="text-xs opacity-60">
                Train curly braces, HTML tags, brackets, and code keywords to recognize your natural handwriting.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Tokens to Train */}
          <div className="w-72 border-r border-current/10 p-4 flex flex-col gap-4 overflow-y-auto bg-black/5 dark:bg-white/5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Select Token to Train
              </label>
              <div className="mt-2 space-y-4">
                {PRESET_CATEGORIES.map(cat => (
                  <div key={cat.category}>
                    <span className="text-[11px] font-mono text-purple-400 font-semibold">
                      {cat.category}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {cat.tokens.map(t => {
                        const count = samples.filter(s => s.token === t.token).length;
                        const isSelected = selectedToken === t.token;
                        return (
                          <button
                            key={t.token}
                            onClick={() => {
                              setSelectedToken(t.token);
                              setSelectedTokenType(t.type);
                              clearTrainingCanvas();
                            }}
                            className={`px-3 py-2 rounded-xl font-mono text-xs font-bold flex items-center justify-between border transition-all ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/30 scale-[1.02]'
                                : 'bg-black/5 dark:bg-white/5 border-current/10 opacity-80 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'
                            }`}
                          >
                            <span className="text-sm">{t.token}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                count > 0 ? 'bg-emerald-500/25 text-emerald-300' : 'opacity-40'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Token Adder */}
            <div className="pt-3 border-t border-current/10">
              <label className="text-[11px] font-mono uppercase tracking-wider opacity-70">
                Add Custom Symbol / Word
              </label>
              <div className="flex gap-1.5 mt-1.5">
                <input
                  type="text"
                  placeholder="e.g. [ ], !=, await"
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
          <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto">
            {/* Active Training Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center font-mono text-2xl font-bold text-purple-300">
                  {selectedToken}
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    Training Token: <span className="font-mono text-purple-400">{selectedToken}</span>
                  </h3>
                  <p className="text-xs opacity-70">
                    Draw this symbol 2 to 4 times below as you naturally write it on the board.
                  </p>
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="text-emerald-400 font-bold">{currentTokenSamples.length}</span> / 3 samples recorded
              </div>
            </div>

            {/* Interactive Drawing Pad */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-medium opacity-80">
                <span>Draw your sample in the pad below:</span>
                {testResult && (
                  <span className="font-mono text-purple-400 flex items-center gap-1.5 animate-in fade-in">
                    <Sparkles className="w-3.5 h-3.5" />
                    Live Match: <strong>{testResult.token}</strong> ({testResult.confidence}% confidence)
                  </span>
                )}
              </div>

              <div
                className={`relative h-64 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden touch-none ${
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
                    <span className="text-xs">Draw here using pen or mouse</span>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  width={600}
                  height={256}
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
                  Save Sample ({currentTokenSamples.length + 1})
                </button>
              </div>
            </div>

            {/* Recorded Samples for this Token */}
            <div className="pt-3 border-t border-current/10">
              <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">
                Recorded Samples for &apos;{selectedToken}&apos; ({currentTokenSamples.length})
              </h4>
              {currentTokenSamples.length === 0 ? (
                <p className="text-xs opacity-40 italic">
                  No samples recorded yet for {selectedToken}. Draw one above to train!
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {currentTokenSamples.map((sample, idx) => (
                    <div
                      key={sample.id}
                      className="p-3 rounded-xl border border-current/15 bg-black/5 dark:bg-white/5 flex items-center justify-between group"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold">Sample #{idx + 1}</span>
                        <span className="text-[10px] block opacity-50 font-mono">
                          {sample.strokeCount} stroke(s)
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSample(sample.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete sample"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-current/10 flex items-center justify-between bg-black/5 dark:bg-white/5">
          <div className="flex items-center gap-2 text-xs opacity-60">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>
              Total Model Samples: <strong>{samples.length}</strong> (Saved automatically to local disk)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-500/25"
          >
            Done & Apply Model
          </button>
        </div>
      </div>
    </div>
  );
};
