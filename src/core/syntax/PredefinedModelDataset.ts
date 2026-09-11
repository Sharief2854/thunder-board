import { Point2D, TrainingSample } from './HandwritingModelTrainer';
import { SyntaxTokenType } from './SyntaxHighlighterEngine';

/**
 * Generates an equidistant resampled point cloud from key path coordinates.
 */
function createResampledTemplate(
  id: string,
  token: string,
  type: SyntaxTokenType,
  rawPath: Point2D[],
  aspectRatio: number,
  strokeCount: number = 1
): TrainingSample {
  const points = resamplePoints(rawPath, 32);
  return {
    id: `predefined_${id}`,
    token,
    type,
    points,
    strokeCount,
    aspectRatio,
    createdAt: 1700000000000,
    isPredefined: true,
  } as TrainingSample & { isPredefined?: boolean };
}

function resamplePoints(points: Point2D[], n: number = 32): Point2D[] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    return Array.from({ length: n }, () => ({ x: points[0].x, y: points[0].y }));
  }

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
  const pts = [...points];

  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (currentDist + d >= interval) {
      const t = (interval - currentDist) / d;
      const qx = pts[i - 1].x + t * (pts[i].x - pts[i - 1].x);
      const qy = pts[i - 1].y + t * (pts[i].y - pts[i - 1].y);
      const newPt = { x: qx, y: qy };
      resampled.push(newPt);
      pts.splice(i, 0, newPt);
      currentDist = 0;
    } else {
      currentDist += d;
    }
  }

  while (resampled.length < n) {
    resampled.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
  }

  // Normalize center and scale to unit bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of resampled) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const maxDim = Math.max(1e-4, maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return resampled.slice(0, n).map(p => ({
    x: (p.x - cx) / maxDim,
    y: (p.y - cy) / maxDim,
  }));
}

/**
 * Built-in pretrained models available immediately out of the box without any user training.
 */
export const PREDEFINED_SAMPLES: TrainingSample[] = [
  // 1. Braces & Brackets
  createResampledTemplate('open_curly', '{', 'operator', [
    { x: 0.2, y: -0.5 }, { x: 0.0, y: -0.4 }, { x: -0.15, y: -0.25 },
    { x: -0.35, y: 0.0 },
    { x: -0.15, y: 0.25 }, { x: 0.0, y: 0.4 }, { x: 0.2, y: 0.5 },
  ], 0.45, 1),

  createResampledTemplate('close_curly', '}', 'operator', [
    { x: -0.2, y: -0.5 }, { x: 0.0, y: -0.4 }, { x: 0.15, y: -0.25 },
    { x: 0.35, y: 0.0 },
    { x: 0.15, y: 0.25 }, { x: 0.0, y: 0.4 }, { x: -0.2, y: 0.5 },
  ], 0.45, 1),

  createResampledTemplate('open_paren', '(', 'operator', [
    { x: 0.2, y: -0.5 }, { x: -0.15, y: -0.25 }, { x: -0.25, y: 0.0 },
    { x: -0.15, y: 0.25 }, { x: 0.2, y: 0.5 },
  ], 0.4, 1),

  createResampledTemplate('close_paren', ')', 'operator', [
    { x: -0.2, y: -0.5 }, { x: 0.15, y: -0.25 }, { x: 0.25, y: 0.0 },
    { x: 0.15, y: 0.25 }, { x: -0.2, y: 0.5 },
  ], 0.4, 1),

  createResampledTemplate('open_bracket', '[', 'operator', [
    { x: 0.25, y: -0.5 }, { x: -0.25, y: -0.5 }, { x: -0.25, y: 0.5 }, { x: 0.25, y: 0.5 },
  ], 0.45, 1),

  createResampledTemplate('close_bracket', ']', 'operator', [
    { x: -0.25, y: -0.5 }, { x: 0.25, y: -0.5 }, { x: 0.25, y: 0.5 }, { x: -0.25, y: 0.5 },
  ], 0.45, 1),

  // 2. Operators & Arrows
  createResampledTemplate('arrow_func', '=>', 'operator', [
    { x: -0.45, y: -0.15 }, { x: 0.05, y: -0.15 },
    { x: -0.45, y: 0.15 }, { x: 0.05, y: 0.15 },
    { x: 0.05, y: -0.3 }, { x: 0.45, y: 0.0 }, { x: 0.05, y: 0.3 },
  ], 1.6, 3),

  createResampledTemplate('thin_arrow', '->', 'operator', [
    { x: -0.45, y: 0.0 }, { x: 0.15, y: 0.0 },
    { x: 0.05, y: -0.25 }, { x: 0.45, y: 0.0 }, { x: 0.05, y: 0.25 },
  ], 1.5, 2),

  createResampledTemplate('equals_op', '=', 'operator', [
    { x: -0.4, y: -0.15 }, { x: 0.4, y: -0.15 },
    { x: -0.4, y: 0.15 }, { x: 0.4, y: 0.15 },
  ], 1.4, 2),

  createResampledTemplate('double_equals', '==', 'operator', [
    { x: -0.45, y: -0.15 }, { x: -0.05, y: -0.15 },
    { x: -0.45, y: 0.15 }, { x: -0.05, y: 0.15 },
    { x: 0.05, y: -0.15 }, { x: 0.45, y: -0.15 },
    { x: 0.05, y: 0.15 }, { x: 0.45, y: 0.15 },
  ], 2.2, 4),

  createResampledTemplate('not_equals', '!=', 'operator', [
    { x: -0.3, y: -0.4 }, { x: -0.3, y: 0.1 },
    { x: -0.3, y: 0.35 }, { x: -0.3, y: 0.45 },
    { x: 0.0, y: -0.15 }, { x: 0.4, y: -0.15 },
    { x: 0.0, y: 0.15 }, { x: 0.4, y: 0.15 },
  ], 1.6, 3),

  createResampledTemplate('plus_op', '+', 'operator', [
    { x: -0.35, y: 0.0 }, { x: 0.35, y: 0.0 },
    { x: 0.0, y: -0.35 }, { x: 0.0, y: 0.35 },
  ], 1.0, 2),

  createResampledTemplate('colon_op', ':', 'operator', [
    { x: 0.0, y: -0.25 }, { x: 0.0, y: -0.2 },
    { x: 0.0, y: 0.2 }, { x: 0.0, y: 0.25 },
  ], 0.3, 2),

  // 3. Comments
  createResampledTemplate('slash_comment', '//', 'comment', [
    { x: -0.3, y: 0.45 }, { x: -0.1, y: -0.45 },
    { x: 0.05, y: 0.45 }, { x: 0.25, y: -0.45 },
  ], 0.7, 2),

  createResampledTemplate('hash_comment', '#', 'comment', [
    { x: -0.2, y: -0.45 }, { x: -0.2, y: 0.45 },
    { x: 0.2, y: -0.45 }, { x: 0.2, y: 0.45 },
    { x: -0.4, y: -0.2 }, { x: 0.4, y: -0.2 },
    { x: -0.4, y: 0.2 }, { x: 0.4, y: 0.2 },
  ], 0.9, 4),

  // 4. HTML / XML Tags
  createResampledTemplate('left_angle', '<', 'tag', [
    { x: 0.35, y: -0.4 }, { x: -0.35, y: 0.0 }, { x: 0.35, y: 0.4 },
  ], 0.75, 1),

  createResampledTemplate('right_angle', '>', 'tag', [
    { x: -0.35, y: -0.4 }, { x: 0.35, y: 0.0 }, { x: -0.35, y: 0.4 },
  ], 0.75, 1),

  createResampledTemplate('closing_tag_prefix', '</', 'tag', [
    { x: 0.1, y: -0.4 }, { x: -0.35, y: 0.0 }, { x: 0.1, y: 0.4 },
    { x: 0.2, y: 0.4 }, { x: 0.4, y: -0.4 },
  ], 1.1, 2),

  createResampledTemplate('div_tag', '<div>', 'tag', [
    { x: -0.45, y: -0.25 }, { x: -0.35, y: 0.0 }, { x: -0.45, y: 0.25 },
    { x: -0.25, y: -0.35 }, { x: -0.25, y: 0.35 }, { x: -0.1, y: 0.0 },
    { x: -0.05, y: -0.2 }, { x: -0.05, y: 0.2 },
    { x: 0.05, y: -0.2 }, { x: 0.15, y: 0.2 }, { x: 0.25, y: -0.2 },
    { x: 0.35, y: -0.25 }, { x: 0.45, y: 0.0 }, { x: 0.35, y: 0.25 },
  ], 2.4, 4),

  createResampledTemplate('close_div_tag', '</div>', 'tag', [
    { x: -0.48, y: -0.25 }, { x: -0.4, y: 0.0 }, { x: -0.48, y: 0.25 },
    { x: -0.35, y: 0.3 }, { x: -0.25, y: -0.3 },
    { x: -0.2, y: -0.35 }, { x: -0.2, y: 0.35 }, { x: -0.1, y: 0.0 },
    { x: -0.05, y: -0.2 }, { x: -0.05, y: 0.2 },
    { x: 0.05, y: -0.2 }, { x: 0.15, y: 0.2 }, { x: 0.25, y: -0.2 },
    { x: 0.35, y: -0.25 }, { x: 0.45, y: 0.0 }, { x: 0.35, y: 0.25 },
  ], 2.8, 5),

  // 5. Python Keywords
  createResampledTemplate('def_keyword', 'def', 'keyword', [
    { x: -0.45, y: 0.35 }, { x: -0.45, y: -0.35 }, { x: -0.25, y: -0.1 }, { x: -0.45, y: 0.1 },
    { x: -0.2, y: 0.0 }, { x: -0.05, y: -0.15 }, { x: -0.15, y: 0.15 }, { x: -0.05, y: 0.15 },
    { x: 0.15, y: -0.35 }, { x: 0.05, y: -0.35 }, { x: 0.05, y: 0.35 }, { x: 0.2, y: 0.0 },
  ], 2.1, 3),

  createResampledTemplate('class_keyword', 'class', 'keyword', [
    { x: -0.45, y: -0.2 }, { x: -0.48, y: 0.0 }, { x: -0.45, y: 0.2 },
    { x: -0.35, y: -0.4 }, { x: -0.35, y: 0.3 },
    { x: -0.25, y: 0.0 }, { x: -0.15, y: -0.2 }, { x: -0.15, y: 0.2 },
    { x: -0.05, y: -0.15 }, { x: -0.05, y: 0.15 },
    { x: 0.05, y: -0.15 }, { x: 0.05, y: 0.15 },
  ], 2.6, 5),

  createResampledTemplate('return_keyword', 'return', 'keyword', [
    { x: -0.45, y: 0.3 }, { x: -0.45, y: -0.2 }, { x: -0.35, y: -0.15 },
    { x: -0.3, y: 0.0 }, { x: -0.2, y: -0.15 }, { x: -0.2, y: 0.15 },
    { x: -0.1, y: -0.3 }, { x: -0.1, y: 0.2 },
    { x: 0.0, y: -0.2 }, { x: 0.0, y: 0.2 }, { x: 0.1, y: 0.2 },
    { x: 0.2, y: 0.2 }, { x: 0.2, y: -0.2 }, { x: 0.3, y: -0.15 },
    { x: 0.4, y: 0.2 }, { x: 0.4, y: -0.2 },
  ], 3.2, 6),

  createResampledTemplate('if_keyword', 'if', 'keyword', [
    { x: -0.35, y: -0.35 }, { x: -0.35, y: 0.35 },
    { x: 0.05, y: -0.35 }, { x: -0.05, y: -0.35 }, { x: -0.05, y: 0.35 }, { x: 0.1, y: -0.05 },
  ], 1.4, 2),

  createResampledTemplate('for_keyword', 'for', 'keyword', [
    { x: -0.35, y: -0.35 }, { x: -0.45, y: -0.35 }, { x: -0.45, y: 0.35 }, { x: -0.3, y: 0.0 },
    { x: -0.15, y: 0.0 }, { x: -0.05, y: -0.15 }, { x: 0.05, y: 0.0 }, { x: -0.05, y: 0.15 },
    { x: 0.2, y: 0.3 }, { x: 0.2, y: -0.15 }, { x: 0.35, y: -0.15 },
  ], 2.2, 3),

  createResampledTemplate('while_keyword', 'while', 'keyword', [
    { x: -0.45, y: -0.2 }, { x: -0.38, y: 0.2 }, { x: -0.3, y: -0.1 }, { x: -0.22, y: 0.2 }, { x: -0.15, y: -0.2 },
    { x: -0.08, y: -0.4 }, { x: -0.08, y: 0.25 },
    { x: 0.05, y: -0.2 }, { x: 0.05, y: 0.2 },
    { x: 0.18, y: -0.4 }, { x: 0.18, y: 0.25 },
    { x: 0.32, y: 0.0 }, { x: 0.42, y: -0.15 }, { x: 0.4, y: 0.2 },
  ], 3.4, 5),

  createResampledTemplate('import_keyword', 'import', 'keyword', [
    { x: -0.45, y: -0.2 }, { x: -0.45, y: 0.2 },
    { x: -0.35, y: 0.2 }, { x: -0.35, y: -0.2 }, { x: -0.25, y: 0.2 }, { x: -0.15, y: -0.2 }, { x: -0.15, y: 0.2 },
    { x: -0.05, y: 0.35 }, { x: -0.05, y: -0.2 }, { x: 0.08, y: -0.1 }, { x: -0.05, y: 0.0 },
    { x: 0.18, y: 0.0 }, { x: 0.25, y: -0.15 }, { x: 0.32, y: 0.0 },
    { x: 0.4, y: -0.35 }, { x: 0.4, y: 0.2 },
  ], 3.5, 6),

  // 6. JavaScript / TypeScript Keywords
  createResampledTemplate('const_keyword', 'const', 'keyword', [
    { x: -0.45, y: -0.15 }, { x: -0.48, y: 0.0 }, { x: -0.45, y: 0.15 },
    { x: -0.3, y: 0.0 }, { x: -0.2, y: -0.15 }, { x: -0.1, y: 0.0 },
    { x: -0.02, y: 0.2 }, { x: -0.02, y: -0.2 }, { x: 0.08, y: 0.0 },
    { x: 0.18, y: -0.15 }, { x: 0.18, y: 0.15 },
    { x: 0.3, y: -0.35 }, { x: 0.3, y: 0.2 },
  ], 3.0, 5),

  createResampledTemplate('let_keyword', 'let', 'keyword', [
    { x: -0.4, y: -0.4 }, { x: -0.4, y: 0.35 }, { x: -0.25, y: 0.35 },
    { x: -0.15, y: 0.0 }, { x: -0.05, y: -0.15 }, { x: -0.05, y: 0.15 },
    { x: 0.15, y: -0.35 }, { x: 0.15, y: 0.35 }, { x: 0.3, y: 0.0 },
  ], 2.2, 3),

  createResampledTemplate('function_keyword', 'function', 'keyword', [
    { x: -0.48, y: -0.35 }, { x: -0.48, y: 0.35 },
    { x: -0.38, y: -0.2 }, { x: -0.38, y: 0.2 }, { x: -0.28, y: 0.2 },
    { x: -0.2, y: 0.2 }, { x: -0.2, y: -0.2 }, { x: -0.1, y: 0.0 },
    { x: -0.02, y: -0.15 }, { x: -0.02, y: 0.15 },
    { x: 0.08, y: -0.35 }, { x: 0.08, y: 0.2 },
    { x: 0.18, y: -0.2 }, { x: 0.18, y: 0.2 },
    { x: 0.28, y: 0.0 }, { x: 0.35, y: 0.0 },
    { x: 0.42, y: 0.2 }, { x: 0.42, y: -0.2 },
  ], 4.2, 8),

  createResampledTemplate('async_keyword', 'async', 'keyword', [
    { x: -0.42, y: 0.0 }, { x: -0.32, y: 0.2 }, { x: -0.32, y: -0.2 },
    { x: -0.2, y: -0.15 }, { x: -0.2, y: 0.15 },
    { x: -0.08, y: -0.2 }, { x: -0.08, y: 0.35 }, { x: 0.05, y: 0.0 },
    { x: 0.15, y: 0.2 }, { x: 0.15, y: -0.2 }, { x: 0.25, y: 0.0 },
    { x: 0.35, y: -0.15 }, { x: 0.35, y: 0.15 },
  ], 2.8, 5),

  // 7. Booleans & Values
  createResampledTemplate('true_value', 'true', 'boolean', [
    { x: -0.4, y: -0.35 }, { x: -0.4, y: 0.3 },
    { x: -0.25, y: 0.2 }, { x: -0.25, y: -0.2 }, { x: -0.15, y: -0.15 },
    { x: -0.05, y: -0.2 }, { x: -0.05, y: 0.2 }, { x: 0.08, y: 0.2 },
    { x: 0.2, y: 0.0 }, { x: 0.3, y: -0.15 }, { x: 0.3, y: 0.15 },
  ], 2.6, 4),

  createResampledTemplate('false_value', 'false', 'boolean', [
    { x: -0.42, y: -0.35 }, { x: -0.42, y: 0.35 }, { x: -0.3, y: 0.0 },
    { x: -0.2, y: 0.0 }, { x: -0.1, y: 0.2 }, { x: -0.1, y: 0.2 },
    { x: 0.0, y: -0.4 }, { x: 0.0, y: 0.35 },
    { x: 0.15, y: -0.15 }, { x: 0.15, y: 0.15 },
    { x: 0.3, y: 0.0 }, { x: 0.4, y: -0.15 }, { x: 0.4, y: 0.15 },
  ], 3.0, 5),

  createResampledTemplate('null_value', 'null', 'boolean', [
    { x: -0.4, y: 0.2 }, { x: -0.4, y: -0.2 }, { x: -0.25, y: 0.0 },
    { x: -0.15, y: -0.2 }, { x: -0.15, y: 0.2 }, { x: -0.05, y: 0.2 },
    { x: 0.08, y: -0.4 }, { x: 0.08, y: 0.3 },
    { x: 0.25, y: -0.4 }, { x: 0.25, y: 0.3 },
  ], 2.5, 4),
];
