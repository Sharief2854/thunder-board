import { Stroke } from '../../types/whiteboard';
import { SyntaxTokenType } from './SyntaxHighlighterEngine';

export interface Point2D {
  x: number;
  y: number;
}

export interface TrainingSample {
  id: string;
  token: string;
  type: SyntaxTokenType;
  points: Point2D[];
  strokeCount: number;
  aspectRatio: number;
  createdAt: number;
}

export interface TrainedModelData {
  version: number;
  name: string;
  updatedAt: number;
  samples: TrainingSample[];
}

export interface MatchCandidate {
  token: string;
  type: SyntaxTokenType;
  score: number; // 0.0 to 1.0 (1.0 = perfect match)
  distance: number;
}

const LOCAL_STORAGE_KEY = 'smartboard_trained_syntax_model_v1';
const RESAMPLE_POINTS_COUNT = 32;

export class HandwritingModelTrainer {
  private static instance: HandwritingModelTrainer | null = null;
  private samples: TrainingSample[] = [];

  constructor() {
    this.loadFromStorage();
    if (this.samples.length === 0) {
      this.seedDefaultTemplates();
    }
  }

  static getInstance(): HandwritingModelTrainer {
    if (!this.instance) {
      this.instance = new HandwritingModelTrainer();
    }
    return this.instance;
  }

  /**
   * Resamples raw stroke points into N equidistant points along the trajectory.
   */
  static resample(points: Point2D[], n: number = RESAMPLE_POINTS_COUNT): Point2D[] {
    if (points.length === 0) return [];
    if (points.length === 1) {
      return Array.from({ length: n }, () => ({ x: points[0].x, y: points[0].y }));
    }

    // 1. Calculate total path length
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }

    if (totalLength === 0) {
      return Array.from({ length: n }, () => ({ x: points[0].x, y: points[0].y }));
    }

    const interval = totalLength / (n - 1);
    const resampled: Point2D[] = [{ x: points[0].x, y: points[0].y }];
    let currentDist = 0;

    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      if (currentDist + d >= interval) {
        const t = (interval - currentDist) / d;
        const qx = points[i - 1].x + t * (points[i].x - points[i - 1].x);
        const qy = points[i - 1].y + t * (points[i].y - points[i - 1].y);
        const newPoint: Point2D = { x: qx, y: qy };
        resampled.push(newPoint);
        points.splice(i, 0, newPoint);
        currentDist = 0;
      } else {
        currentDist += d;
      }
    }

    while (resampled.length < n) {
      resampled.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
    }

    return resampled.slice(0, n);
  }

  /**
   * Normalizes points: translates center to origin (0, 0) and scales to standard 1.0 box.
   */
  static normalizePoints(rawPoints: Point2D[]): { points: Point2D[]; aspectRatio: number } {
    if (rawPoints.length === 0) return { points: [], aspectRatio: 1 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of rawPoints) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const maxDim = Math.max(width, height);
    const aspectRatio = width / height;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const resampled = this.resample(rawPoints, RESAMPLE_POINTS_COUNT);

    const normalized = resampled.map(p => ({
      x: (p.x - centerX) / maxDim,
      y: (p.y - centerY) / maxDim,
    }));

    return { points: normalized, aspectRatio };
  }

  /**
   * Converts a collection of raw strokes into a single continuous normalized Point2D sequence.
   */
  static strokesToNormalizedPoints(strokes: Stroke[]): { points: Point2D[]; aspectRatio: number } {
    const rawPoints: Point2D[] = [];
    for (const s of strokes) {
      for (const pt of s.points) {
        rawPoints.push({ x: pt.x, y: pt.y });
      }
    }
    return this.normalizePoints(rawPoints);
  }

  /**
   * Calculates greedy point-cloud distance ($P / $Q Euclidean distance) between two normalized patterns.
   */
  static computeDistance(pts1: Point2D[], pts2: Point2D[]): number {
    if (pts1.length === 0 || pts2.length === 0) return Infinity;
    const n = Math.min(pts1.length, pts2.length);
    let sumDist = 0;

    for (let i = 0; i < n; i++) {
      sumDist += Math.hypot(pts1[i].x - pts2[i].x, pts1[i].y - pts2[i].y);
    }

    return sumDist / n;
  }

  /**
   * Adds a user-drawn training sample for a specific token.
   */
  addSample(token: string, type: SyntaxTokenType, strokes: Stroke[]): TrainingSample {
    const { points, aspectRatio } = HandwritingModelTrainer.strokesToNormalizedPoints(strokes);
    const sample: TrainingSample = {
      id: `sample_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      token: token.trim(),
      type,
      points,
      strokeCount: strokes.length,
      aspectRatio,
      createdAt: Date.now(),
    };

    this.samples.push(sample);
    this.saveToStorage();
    return sample;
  }

  /**
   * Removes a sample by id
   */
  removeSample(id: string): void {
    this.samples = this.samples.filter(s => s.id !== id);
    this.saveToStorage();
  }

  /**
   * Clears samples for a specific token
   */
  clearTokenSamples(token: string): void {
    this.samples = this.samples.filter(s => s.token.toLowerCase() !== token.toLowerCase());
    this.saveToStorage();
  }

  /**
   * Gets all samples
   */
  getSamples(): TrainingSample[] {
    return [...this.samples];
  }

  /**
   * Gets samples grouped by token
   */
  getTokensSummary(): { token: string; type: SyntaxTokenType; count: number }[] {
    const map = new Map<string, { token: string; type: SyntaxTokenType; count: number }>();
    for (const s of this.samples) {
      const existing = map.get(s.token);
      if (existing) {
        existing.count++;
      } else {
        map.set(s.token, { token: s.token, type: s.type, count: 1 });
      }
    }
    return Array.from(map.values());
  }

  /**
   * Classifies input strokes against the trained model samples.
   * Returns candidates sorted by confidence score (0.0 to 1.0).
   */
  classify(strokes: Stroke[], minConfidence: number = 0.65): MatchCandidate | null {
    if (this.samples.length === 0 || strokes.length === 0) return null;

    const { points: inputPoints, aspectRatio: inputRatio } =
      HandwritingModelTrainer.strokesToNormalizedPoints(strokes);
    if (inputPoints.length === 0) return null;

    let bestMatch: MatchCandidate | null = null;
    let minDistance = Infinity;

    for (const sample of this.samples) {
      // Aspect ratio tolerance check (must be somewhat compatible)
      const ratioDiff = Math.abs(Math.log(Math.max(0.1, inputRatio) / Math.max(0.1, sample.aspectRatio)));
      if (ratioDiff > 1.25) continue;

      const dist = HandwritingModelTrainer.computeDistance(inputPoints, sample.points);
      if (dist < minDistance) {
        minDistance = dist;
        // Map distance [0.0 ... 0.6] to confidence score [1.0 ... 0.0]
        const score = Math.max(0, 1 - dist / 0.55);
        bestMatch = {
          token: sample.token,
          type: sample.type,
          score: Math.round(score * 100) / 100,
          distance: dist,
        };
      }
    }

    if (bestMatch && bestMatch.score >= minConfidence) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Persists trained dataset to localStorage & Electron IPC
   */
  saveToStorage(): void {
    try {
      const modelData: TrainedModelData = {
        version: 1,
        name: 'Custom ThunderBoard Handwriting Model',
        updatedAt: Date.now(),
        samples: this.samples,
      };
      const jsonStr = JSON.stringify(modelData);
      localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);

      if (window.smartBoardAPI) {
        window.smartBoardAPI.saveBoard('custom_syntax_model', jsonStr).catch(() => {});
      }
    } catch {}
  }

  /**
   * Loads trained model from storage
   */
  async loadFromStorage(): Promise<void> {
    try {
      if (window.smartBoardAPI) {
        const res = await window.smartBoardAPI.loadBoard('custom_syntax_model');
        if (res.success && res.data) {
          const parsed = JSON.parse(res.data) as TrainedModelData;
          if (parsed && Array.isArray(parsed.samples)) {
            this.samples = parsed.samples;
            return;
          }
        }
      }

      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local) as TrainedModelData;
        if (parsed && Array.isArray(parsed.samples)) {
          this.samples = parsed.samples;
        }
      }
    } catch {}
  }

  /**
   * Seeds initial geometric base templates for common symbols ({, }, <, >, =>, //, etc.)
   */
  private seedDefaultTemplates(): void {
    // 1. Open curly brace '{'
    const openBracePoints: Point2D[] = [
      { x: 0.2, y: -0.5 },
      { x: 0.0, y: -0.4 },
      { x: -0.1, y: -0.25 },
      { x: -0.3, y: 0.0 },
      { x: -0.1, y: 0.25 },
      { x: 0.0, y: 0.4 },
      { x: 0.2, y: 0.5 },
    ];
    this.samples.push({
      id: 'default_open_brace',
      token: '{',
      type: 'operator',
      points: HandwritingModelTrainer.resample(openBracePoints),
      strokeCount: 1,
      aspectRatio: 0.45,
      createdAt: Date.now(),
    });

    // 2. Closing curly brace '}'
    const closeBracePoints: Point2D[] = [
      { x: -0.2, y: -0.5 },
      { x: 0.0, y: -0.4 },
      { x: 0.1, y: -0.25 },
      { x: 0.3, y: 0.0 },
      { x: 0.1, y: 0.25 },
      { x: 0.0, y: 0.4 },
      { x: -0.2, y: 0.5 },
    ];
    this.samples.push({
      id: 'default_close_brace',
      token: '}',
      type: 'operator',
      points: HandwritingModelTrainer.resample(closeBracePoints),
      strokeCount: 1,
      aspectRatio: 0.45,
      createdAt: Date.now(),
    });

    // 3. Arrow function '=>'
    const arrowPoints: Point2D[] = [
      { x: -0.4, y: -0.15 },
      { x: 0.1, y: -0.15 },
      { x: -0.4, y: 0.15 },
      { x: 0.1, y: 0.15 },
      { x: 0.1, y: -0.3 },
      { x: 0.4, y: 0.0 },
      { x: 0.1, y: 0.3 },
    ];
    this.samples.push({
      id: 'default_arrow',
      token: '=>',
      type: 'operator',
      points: HandwritingModelTrainer.resample(arrowPoints),
      strokeCount: 3,
      aspectRatio: 1.6,
      createdAt: Date.now(),
    });

    // 4. HTML Open Angle Bracket '<'
    const leftAngle: Point2D[] = [
      { x: 0.3, y: -0.4 },
      { x: -0.3, y: 0.0 },
      { x: 0.3, y: 0.4 },
    ];
    this.samples.push({
      id: 'default_left_angle',
      token: '<',
      type: 'tag',
      points: HandwritingModelTrainer.resample(leftAngle),
      strokeCount: 1,
      aspectRatio: 0.75,
      createdAt: Date.now(),
    });

    // 5. HTML Close Angle Bracket '>'
    const rightAngle: Point2D[] = [
      { x: -0.3, y: -0.4 },
      { x: 0.3, y: 0.0 },
      { x: -0.3, y: 0.4 },
    ];
    this.samples.push({
      id: 'default_right_angle',
      token: '>',
      type: 'tag',
      points: HandwritingModelTrainer.resample(rightAngle),
      strokeCount: 1,
      aspectRatio: 0.75,
      createdAt: Date.now(),
    });
  }
}
