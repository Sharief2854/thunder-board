import { Stroke, BoardThemeType } from '../../types/whiteboard';

export type SupportedLanguage = 'auto' | 'html' | 'css' | 'javascript' | 'python' | 'java';

export type SyntaxTokenType =
  | 'keyword'
  | 'string'
  | 'tag'
  | 'number'
  | 'comment'
  | 'property'
  | 'boolean'
  | 'operator';

export interface StrokeCluster {
  id: string;
  strokeIds: string[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerY: number;
  height: number;
  width: number;
  lastTimestamp: number;
}

export interface HighlightResult {
  updatedStrokes: Record<string, Stroke>;
  changedCount: number;
  recognizedToken?: {
    type: SyntaxTokenType;
    label: string;
    clusterBox: { minX: number; minY: number; maxX: number; maxY: number };
  };
}

/**
 * Syntax color definitions tailored for dark (blackboard) & light (whiteboard) backgrounds.
 */
export const SYNTAX_PALETTE: Record<BoardThemeType, Record<SyntaxTokenType, string>> = {
  blackboard: {
    keyword: '#c084fc', // Vibrant Violet / Purple (def, function, class, return)
    string: '#4ade80',  // Vivid Emerald Green ("hello", 'world')
    tag: '#38bdf8',     // Sky Blue / Cyan (<div>, <span>, </>)
    number: '#fb923c',  // Warm Amber / Orange (100, 3.14)
    comment: '#94a3b8', // Muted Slate Gray (//, #)
    property: '#f472b6',// Soft Pink (display, margin, flex)
    boolean: '#e879f9', // Fuchsia (true, false, None, null)
    operator: '#67e8f9',// Soft Cyan (=, +, =>, :)
  },
  whiteboard: {
    keyword: '#7c3aed', // Deep Purple
    string: '#15803d',  // Forest Green
    tag: '#0284c7',     // Deep Sky Blue
    number: '#ea580c',  // Deep Orange
    comment: '#64748b', // Slate
    property: '#be185d',// Deep Magenta
    boolean: '#9333ea', // Purple
    operator: '#0891b2',// Teal Cyan
  },
  chalkboard: {
    keyword: '#d8b4fe',
    string: '#86efac',
    tag: '#7dd3fc',
    number: '#fdba74',
    comment: '#cbd5e1',
    property: '#f9a8d4',
    boolean: '#f0abfc',
    operator: '#a5f3fc',
  },
  custom: {
    keyword: '#c084fc',
    string: '#4ade80',
    tag: '#38bdf8',
    number: '#fb923c',
    comment: '#94a3b8',
    property: '#f472b6',
    boolean: '#e879f9',
    operator: '#67e8f9',
  },
};

/**
 * Programming keywords database across HTML, CSS, JS, Python, and Java.
 */
const KEYWORDS = new Set([
  // Python
  'def', 'class', 'import', 'from', 'return', 'if', 'elif', 'else', 'while', 'for',
  'in', 'try', 'except', 'finally', 'with', 'as', 'lambda', 'pass', 'break', 'continue',
  'yield', 'global', 'raise', 'is', 'not', 'and', 'or',
  // JavaScript / TypeScript
  'function', 'const', 'let', 'var', 'async', 'await', 'export', 'default',
  'new', 'this', 'typeof', 'instanceof', 'void', 'switch', 'case', 'catch', 'throw',
  // Java
  'public', 'private', 'protected', 'static', 'final', 'interface', 'extends',
  'implements', 'package', 'throws', 'abstract', 'synchronized', 'volatile',
  'int', 'boolean', 'double', 'float', 'char', 'long', 'short', 'byte',
  // CSS
  '@media', '@keyframes', '!important',
]);

const BOOLEANS = new Set([
  'true', 'false', 'null', 'undefined', 'None', 'True', 'False', 'nil', 'NaN'
]);

const CSS_PROPERTIES = new Set([
  'display', 'flex', 'grid', 'color', 'background', 'margin', 'padding', 'width',
  'height', 'position', 'border', 'font', 'align', 'justify', 'center', 'none',
  'block', 'absolute', 'relative', 'fixed', 'gap', 'overflow'
]);

export class SyntaxHighlighterEngine {
  /**
   * Identifies word clusters in recent strokes based on spatial proximity.
   * Groups strokes horizontally on the same line.
   */
  static clusterStrokesIntoWords(strokes: Stroke[]): StrokeCluster[] {
    const validStrokes = strokes.filter(s => !s.isErased && s.tool !== 'stroke-eraser');
    if (validStrokes.length === 0) return [];

    // Sort strokes by creation time
    const sorted = [...validStrokes].sort((a, b) => a.createdAt - b.createdAt);
    const clusters: StrokeCluster[] = [];

    for (const stroke of sorted) {
      const box = stroke.boundingBox;
      const strokeCenterY = (box.minY + box.maxY) / 2;
      const strokeHeight = Math.max(16, box.height);

      let matchedCluster: StrokeCluster | null = null;

      // Find if this stroke belongs to an existing word on the same horizontal line
      for (let i = clusters.length - 1; i >= 0; i--) {
        const c = clusters[i];
        const lineTolerance = Math.max(strokeHeight, c.height) * 1.1;
        const sameLine = Math.abs(strokeCenterY - c.centerY) <= lineTolerance;

        if (sameLine) {
          // Horizontal gap threshold: space between letters in a handwritten word
          const maxLetterGap = Math.max(35, strokeHeight * 1.2);
          const isAdjacent =
            box.minX >= c.minX - maxLetterGap &&
            box.minX <= c.maxX + maxLetterGap;

          if (isAdjacent) {
            matchedCluster = c;
            break;
          }
        }
      }

      if (matchedCluster) {
        matchedCluster.strokeIds.push(stroke.id);
        matchedCluster.minX = Math.min(matchedCluster.minX, box.minX);
        matchedCluster.minY = Math.min(matchedCluster.minY, box.minY);
        matchedCluster.maxX = Math.max(matchedCluster.maxX, box.maxX);
        matchedCluster.maxY = Math.max(matchedCluster.maxY, box.maxY);
        matchedCluster.centerY = (matchedCluster.minY + matchedCluster.maxY) / 2;
        matchedCluster.height = matchedCluster.maxY - matchedCluster.minY;
        matchedCluster.width = matchedCluster.maxX - matchedCluster.minX;
        matchedCluster.lastTimestamp = Math.max(matchedCluster.lastTimestamp, stroke.createdAt);
      } else {
        clusters.push({
          id: `cluster_${stroke.id}`,
          strokeIds: [stroke.id],
          minX: box.minX,
          minY: box.minY,
          maxX: box.maxX,
          maxY: box.maxY,
          centerY: strokeCenterY,
          height: strokeHeight,
          width: Math.max(10, box.width),
          lastTimestamp: stroke.createdAt,
        });
      }
    }

    return clusters;
  }

  /**
   * Option 2 Underline Gesture Detector:
   * Checks if a newly drawn stroke is a horizontal underline gesture beneath an existing word cluster.
   */
  static detectUnderlineGesture(
    newStroke: Stroke,
    allStrokes: Stroke[]
  ): { targetCluster: StrokeCluster; underlineStrokeId: string } | null {
    if (newStroke.points.length < 2) return null;

    const box = newStroke.boundingBox;
    // Must be a predominantly horizontal stroke
    if (box.width < 25 || box.width < box.height * 2.2) return null;

    const pStart = newStroke.points[0];
    const pEnd = newStroke.points[newStroke.points.length - 1];
    const totalDx = Math.abs(pEnd.x - pStart.x);
    const totalDy = Math.abs(pEnd.y - pStart.y);
    if (totalDx < totalDy * 2.0) return null;

    // Exclude the new stroke itself when clustering other strokes
    const otherStrokes = allStrokes.filter(s => s.id !== newStroke.id && !s.isErased);
    const clusters = this.clusterStrokesIntoWords(otherStrokes);

    for (const cluster of clusters) {
      // Must be positioned directly below the cluster
      const verticalGap = box.minY - cluster.maxY;
      const isBelow = verticalGap >= -10 && verticalGap <= 50;

      // Must horizontally overlap the cluster
      const horizontalOverlap =
        Math.min(box.maxX, cluster.maxX) - Math.max(box.minX, cluster.minX);
      const minRequiredOverlap = Math.min(cluster.width * 0.4, 30);

      if (isBelow && horizontalOverlap >= minRequiredOverlap) {
        return { targetCluster: cluster, underlineStrokeId: newStroke.id };
      }
    }

    return null;
  }

  /**
   * Levenshtein Distance for fuzzy matching handwriting strings.
   */
  static levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  /**
   * Fuzzy matches raw or slightly noisy strings against known programming keywords.
   */
  static fuzzyMatchKeyword(rawText: string): { matchedWord: string; type: SyntaxTokenType } | null {
    const clean = rawText.toLowerCase().replace(/[^a-z0-9_$@]/g, '').trim();
    if (!clean || clean.length < 2) return null;

    if (KEYWORDS.has(clean)) return { matchedWord: clean, type: 'keyword' };
    if (BOOLEANS.has(clean)) return { matchedWord: clean, type: 'boolean' };
    if (CSS_PROPERTIES.has(clean)) return { matchedWord: clean, type: 'property' };

    const maxAllowedDist = clean.length <= 4 ? 1 : 2;

    for (const kw of KEYWORDS) {
      if (Math.abs(kw.length - clean.length) <= maxAllowedDist) {
        if (this.levenshtein(clean, kw) <= maxAllowedDist) {
          return { matchedWord: kw, type: 'keyword' };
        }
      }
    }

    for (const bool of BOOLEANS) {
      if (Math.abs(bool.length - clean.length) <= maxAllowedDist) {
        if (this.levenshtein(clean, bool) <= maxAllowedDist) {
          return { matchedWord: bool, type: 'boolean' };
        }
      }
    }

    return null;
  }

  /**
   * Evaluates text or word candidate to determine syntax role
   */
  static classifyToken(wordText: string): SyntaxTokenType | null {
    const clean = wordText.trim();
    if (!clean) return null;

    // Comments: // ... or # ...
    if (clean.startsWith('//') || clean.startsWith('#') || clean.startsWith('/*')) {
      return 'comment';
    }

    // HTML / XML Tags: <div>, </span>, <p>, </...>
    if (/^<\/?[a-zA-Z0-9_-]+>?$/.test(clean) || (clean.startsWith('<') && clean.endsWith('>'))) {
      return 'tag';
    }

    // Strings & Quotes: "..." or '...'
    if (
      (clean.startsWith('"') && clean.endsWith('"') && clean.length > 1) ||
      (clean.startsWith("'") && clean.endsWith("'") && clean.length > 1) ||
      (clean.startsWith('`') && clean.endsWith('`') && clean.length > 1)
    ) {
      return 'string';
    }

    // Numbers: 100, 3.14, 0x1F
    if (/^-?\d+(\.\d+)?(px|rem|em|%)?$/.test(clean)) {
      return 'number';
    }

    // Booleans & Null
    if (BOOLEANS.has(clean)) {
      return 'boolean';
    }

    // Direct and fuzzy keyword matching
    const fuzzy = this.fuzzyMatchKeyword(clean);
    if (fuzzy) {
      return fuzzy.type;
    }

    // CSS Properties
    const lower = clean.toLowerCase().replace(/[:;{}()]/g, '');
    if (CSS_PROPERTIES.has(lower)) {
      return 'property';
    }

    // Arrow function & Operators
    if (clean === '=>' || clean === '->' || clean === '==' || clean === '!=') {
      return 'operator';
    }

    return null;
  }

  /**
   * Advanced Geometric Stroke & Gesture Classifier:
   * Recognizes handwritten code tokens by stroke geometry, aspect ratios, and letter structures.
   */
  static detectSymbolInStrokes(strokes: Stroke[]): SyntaxTokenType | null {
    if (strokes.length === 0) return null;

    // 1. Comments: '//' or '#' or '/*'
    // Slashes: 2 slanted parallel vertical strokes with positive slope
    if (strokes.length >= 2) {
      const firstTwo = strokes.slice(0, 2);
      const isSlashes = firstTwo.every(s => {
        if (s.points.length < 2) return false;
        const dy = s.points[s.points.length - 1].y - s.points[0].y;
        const dx = s.points[s.points.length - 1].x - s.points[0].x;
        return dy > 12 && dx >= -15 && dx <= 35 && s.boundingBox.height > 18;
      });
      if (isSlashes) return 'comment';

      // Hash symbol '#': 2 vertical + 2 horizontal crossing strokes
      if (strokes.length === 4) {
        const isHash = strokes.some(s => s.boundingBox.width > s.boundingBox.height) &&
                       strokes.some(s => s.boundingBox.height > s.boundingBox.width);
        if (isHash) return 'comment';
      }
    }

    // 2. HTML Tags: '<' ... '>'
    // Any gesture with an angle bracket < or >
    const hasLeftBracket = strokes.some(s => {
      if (s.points.length < 3) return false;
      const start = s.points[0];
      const mid = s.points[Math.floor(s.points.length / 2)];
      const end = s.points[s.points.length - 1];
      return mid.x < start.x - 8 && mid.x < end.x - 8 && Math.abs(start.y - end.y) > 10;
    });
    const hasRightBracket = strokes.some(s => {
      if (s.points.length < 3) return false;
      const start = s.points[0];
      const mid = s.points[Math.floor(s.points.length / 2)];
      const end = s.points[s.points.length - 1];
      return mid.x > start.x + 8 && mid.x > end.x + 8 && Math.abs(start.y - end.y) > 10;
    });
    if (hasLeftBracket || hasRightBracket) {
      return 'tag';
    }

    // 3. Strings & Quotes: '...' or "..."
    // Quotation ticks: 1 or 2 small vertical/diagonal ticks at top of cluster
    const quoteTicks = strokes.filter(s => {
      const b = s.boundingBox;
      return b.height < 30 && b.width < 25 && s.points.length < 20;
    });
    if (quoteTicks.length >= 2 || (strokes.length <= 3 && quoteTicks.length >= 1)) {
      return 'string';
    }

    // 4. Numbers: 0, 1, 2, 3, etc. or pure digit sequences
    // Single closed loop (0, 8, 6) or straight vertical line (1) or Z/S shape (2, 3, 5)
    if (strokes.length === 1) {
      const s = strokes[0];
      const b = s.boundingBox;
      const start = s.points[0];
      const end = s.points[s.points.length - 1];
      const isClosedLoop = Math.hypot(start.x - end.x, start.y - end.y) < 14 && s.points.length > 10;
      if (isClosedLoop && b.height < 60 && b.width < 50) {
        return 'number';
      }
    }

    // 5. Short Keyword Cluster (e.g. def, if, for, let, var, int)
    // Typically 2 to 7 strokes with standard aspect ratio (width > height)
    const clusterWidth = Math.max(...strokes.map(s => s.boundingBox.maxX)) - Math.min(...strokes.map(s => s.boundingBox.minX));
    const clusterHeight = Math.max(...strokes.map(s => s.boundingBox.maxY)) - Math.min(...strokes.map(s => s.boundingBox.minY));
    const aspectRatio = clusterWidth / Math.max(1, clusterHeight);

    // Words with 3 to 12 strokes on a line (def, class, function, return, public, void)
    if (strokes.length >= 3 && strokes.length <= 15 && aspectRatio >= 1.2 && aspectRatio <= 6.0) {
      return 'keyword';
    }

    return null;
  }

  /**
   * Applies syntax color to strokes belonging to recognized clusters in-place.
   * Returns mutated strokes record.
   */
  static applySyntaxHighlighting(
    strokesRecord: Record<string, Stroke>,
    theme: BoardThemeType,
    overrides?: { strokeId: string; tokenType: SyntaxTokenType }[]
  ): { updatedStrokes: Record<string, Stroke>; changedCount: number } {
    const palette = SYNTAX_PALETTE[theme] || SYNTAX_PALETTE.blackboard;
    let changedCount = 0;
    const updatedStrokes = { ...strokesRecord };

    // Apply any explicit token overrides
    if (overrides && overrides.length > 0) {
      for (const ov of overrides) {
        const existing = updatedStrokes[ov.strokeId];
        if (existing && !existing.isErased) {
          const newColor = palette[ov.tokenType];
          if (existing.color !== newColor) {
            updatedStrokes[ov.strokeId] = { ...existing, color: newColor };
            changedCount++;
          }
        }
      }
    }

    return { updatedStrokes, changedCount };
  }
}
