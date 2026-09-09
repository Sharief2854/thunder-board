import { BoundingBox } from './whiteboard';

export type OverlayType =
  | 'main-heading'
  | 'heading'
  | 'sub-heading'
  | 'warning'
  | 'important'
  | 'question'
  | 'bullet'
  | 'keyword'
  | 'concept-connection'
  | 'definition'
  | 'focus-box';

export type OverlayStyle =
  | 'underline'
  | 'background'
  | 'badge'
  | 'glow'
  | 'box'
  | 'arrow'
  | 'connector';

export interface VisualOverlay {
  id: string;
  ruleId: string;
  targetStrokeIds: string[];
  type: OverlayType;
  label?: string;
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  style: OverlayStyle;
  bounds: BoundingBox;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export type SymbolShortcut = '#' | '##' | '###' | '!' | '?' | '*' | '->';

export interface SymbolShortcutDefinition {
  symbol: SymbolShortcut;
  meaning: string;
  semanticType: OverlayType;
  color: string;
  highlightStyle: OverlayStyle;
  priority: number;
  enabled: boolean;
}

export type GestureType = 'underline' | 'rectangle' | 'circle' | 'arrow' | 'strike-through' | 'bracket';

export type ProgrammingLanguage = 'html' | 'css' | 'javascript' | 'typescript' | 'react' | 'python' | 'all';

export interface RuleCondition {
  type: 'symbol-prefix' | 'gesture' | 'keyword-match' | 'spatial-proximity' | 'pause';
  symbol?: string;
  gestureType?: GestureType;
  language?: ProgrammingLanguage;
  keywords?: string[];
  spatialRelation?: 'above' | 'below' | 'inside' | 'connected_to';
}

export interface RuleAction {
  semanticType: OverlayType;
  overlayStyle: OverlayStyle;
  color: string;
  backgroundColor?: string;
  label?: string;
  priority: number;
}

export interface SmartRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: RuleCondition[];
  action: RuleAction;
}
