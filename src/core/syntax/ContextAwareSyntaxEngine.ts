import { Stroke } from '../../types/whiteboard';
import { StrokeCluster, SyntaxTokenType, SyntaxHighlighterEngine } from './SyntaxHighlighterEngine';
import { HandwritingModelTrainer, MatchCandidate } from './HandwritingModelTrainer';

export interface ContextualAnalysisResult {
  tokenType: SyntaxTokenType;
  tokenLabel: string;
  confidence: number;
  reason: string;
}

export class ContextAwareSyntaxEngine {
  /**
   * Evaluates a target stroke cluster by combining:
   * 1. Direct Point-Cloud Trained Model Match
   * 2. Neighbor stroke analysis (preceding tokens on the left, line baseline)
   * 3. Unclosed bracket / tag structural context
   */
  static analyzeWithContext(
    targetCluster: StrokeCluster,
    targetStrokes: Stroke[],
    allPageStrokes: Stroke[]
  ): ContextualAnalysisResult | null {
    if (targetStrokes.length === 0) return null;

    // 1. Get raw model candidate match from user-trained templates
    const trainer = HandwritingModelTrainer.getInstance();
    const rawCandidate: MatchCandidate | null = trainer.classify(targetStrokes, 0.45);

    // 2. Identify surrounding context (left neighbors, right neighbors, line context)
    const otherStrokes = allPageStrokes.filter(
      s => !targetCluster.strokeIds.includes(s.id) && !s.isErased
    );
    const otherClusters = SyntaxHighlighterEngine.clusterStrokesIntoWords(otherStrokes);

    // Sort clusters reading order: top-to-bottom, left-to-right
    otherClusters.sort((a, b) => {
      const lineTolerance = 25;
      if (Math.abs(a.centerY - b.centerY) > lineTolerance) {
        return a.centerY - b.centerY;
      }
      return a.minX - b.minX;
    });

    // Find previous cluster on same horizontal line (immediate left neighbor)
    let leftNeighbor: StrokeCluster | null = null;
    let minLeftDistance = Infinity;

    for (const c of otherClusters) {
      const sameLine = Math.abs(c.centerY - targetCluster.centerY) <= Math.max(25, targetCluster.height * 0.8);
      if (sameLine && c.maxX < targetCluster.minX) {
        const gap = targetCluster.minX - c.maxX;
        if (gap < minLeftDistance && gap < 200) {
          minLeftDistance = gap;
          leftNeighbor = c;
        }
      }
    }

    // Classify left neighbor token
    let leftNeighborToken: { type: SyntaxTokenType; label: string } | null = null;
    if (leftNeighbor) {
      const leftStrokes = otherStrokes.filter(s => leftNeighbor!.strokeIds.includes(s.id));
      const leftMatch = trainer.classify(leftStrokes, 0.55);
      if (leftMatch) {
        leftNeighborToken = { type: leftMatch.type, label: leftMatch.token };
      } else {
        const sym = SyntaxHighlighterEngine.detectSymbolInStrokes(leftStrokes);
        if (sym) leftNeighborToken = { type: sym, label: sym };
      }
    }

    // 3. Scan document history for unclosed braces '{' or tags '<div>'
    let unclosedBracesCount = 0;
    let unclosedTagsCount = 0;

    for (const c of otherClusters) {
      if (c.lastTimestamp >= targetCluster.lastTimestamp) continue;
      const cStrokes = otherStrokes.filter(s => c.strokeIds.includes(s.id));
      const match = trainer.classify(cStrokes, 0.6);
      if (match) {
        if (match.token === '{') unclosedBracesCount++;
        if (match.token === '}') unclosedBracesCount = Math.max(0, unclosedBracesCount - 1);
        if (match.token.startsWith('<') && !match.token.startsWith('</') && match.token.endsWith('>')) {
          unclosedTagsCount++;
        }
        if (match.token.startsWith('</')) {
          unclosedTagsCount = Math.max(0, unclosedTagsCount - 1);
        }
      }
    }

    // 4. Apply Context Scoring Boosts
    let finalConfidence = rawCandidate ? rawCandidate.score : 0.5;
    let selectedToken = rawCandidate ? rawCandidate.token : '';
    let selectedType = rawCandidate ? rawCandidate.type : 'operator';
    let boostReason = 'Trained pattern match';

    // Boost A: Open Brace '{' preceded by function / if / class / arrow
    if (leftNeighborToken) {
      const isBlockStarter =
        leftNeighborToken.type === 'keyword' ||
        leftNeighborToken.label === '=>' ||
        leftNeighborToken.label.endsWith(')');

      if (isBlockStarter) {
        if (!rawCandidate || rawCandidate.token === '{' || rawCandidate.distance < 0.48) {
          selectedToken = '{';
          selectedType = 'operator';
          finalConfidence = Math.min(0.98, finalConfidence + 0.3);
          boostReason = `Follows block starter '${leftNeighborToken.label}' -> '{'`;
        }
      }
    }

    // Boost B: Closing Brace '}' when unclosed '{' exists
    if (unclosedBracesCount > 0) {
      if (rawCandidate && (rawCandidate.token === '}' || rawCandidate.token === '{')) {
        // If it looks like a brace and we have pending unclosed braces, favor closing brace '}'
        if (rawCandidate.token === '}') {
          finalConfidence = Math.min(0.99, finalConfidence + 0.25);
          boostReason = `Matches pending unclosed '{' -> '}'`;
        }
      }
    }

    // Boost C: HTML Tag context: if contains '<' or unclosed tags
    if (unclosedTagsCount > 0 && rawCandidate && rawCandidate.token.startsWith('</')) {
      finalConfidence = Math.min(0.99, finalConfidence + 0.25);
      boostReason = `Matches pending unclosed HTML tag`;
    }

    // Boost D: Fallback to geometric engine if model confidence is low
    if (finalConfidence < 0.65) {
      const fallbackSym = SyntaxHighlighterEngine.detectSymbolInStrokes(targetStrokes);
      if (fallbackSym) {
        return {
          tokenType: fallbackSym,
          tokenLabel: fallbackSym,
          confidence: 0.72,
          reason: 'Geometric structural detection',
        };
      }
      return null;
    }

    return {
      tokenType: selectedType,
      tokenLabel: selectedToken,
      confidence: Math.round(finalConfidence * 100) / 100,
      reason: boostReason,
    };
  }
}
