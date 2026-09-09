export interface InkPoint {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  timestamp: number; // ms timestamp
}

export type StrokeTool = 'pen' | 'pencil' | 'highlighter' | 'stroke-eraser' | 'select' | 'pan' | 'text' | 'shape';

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'arrow' | 'line' | 'diamond' | 'star';

export type TextElementMode = 'text' | 'code';

export interface TextBoxElement {
  id: string;
  pageId: string;
  x: number; // World coordinate x
  y: number; // World coordinate y
  width: number;
  height: number;
  content: string;
  mode: TextElementMode; // 'text' for normal notes, 'code' for syntax highlighted code
  language: string; // 'javascript', 'python', 'html', 'css', 'java', etc.
  fontSize: number;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Stroke {
  id: string;
  pageId: string;
  tool: StrokeTool;
  color: string;
  width: number;
  points: InkPoint[];
  pathOutline?: number[][]; // Cached polygon outline from perfect-freehand
  boundingBox: BoundingBox;
  createdAt: number;
  isErased?: boolean;
  shapeData?: {
    type: ShapeType;
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
}

export interface WhiteboardPage {
  id: string;
  title: string;
  order: number;
  strokeIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type BoardThemeType = 'whiteboard' | 'blackboard' | 'chalkboard' | 'custom';

export interface ViewportTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface Batch {
  id: string;
  name: string;
  subject?: string;
  description?: string;
  saveLocation?: string; // Custom directory path where batch notes and .sblesson are saved
  createdAt: number;
  updatedAt: number;
  activePageId: string;
  pages: WhiteboardPage[];
  strokes: Record<string, Stroke>;
  textElements?: Record<string, TextBoxElement>;
  theme: BoardThemeType;
}

export interface AppWorkspace {
  activeBatchId: string;
  batches: Batch[];
}

export interface WhiteboardDocument {
  id: string;
  title: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  theme: BoardThemeType;
  activePageId: string;
  pages: WhiteboardPage[];
  strokes: Record<string, Stroke>;
  textElements?: Record<string, TextBoxElement>;
}

declare global {
  interface Window {
    smartBoardAPI?: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      isMaximized: () => Promise<boolean>;
      saveBoard: (id: string, data: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      loadBoard: (id: string) => Promise<{ success: boolean; data?: string; error?: string }>;
      listBoards: () => Promise<{ success: boolean; boards?: string[]; error?: string }>;
      exportFile: (defaultName: string, content: string) => Promise<{ canceled: boolean; filePath?: string }>;
      importFile: () => Promise<{ canceled: boolean; content?: string; filePath?: string }>;
      selectDirectory: () => Promise<{ canceled: boolean; path?: string }>;
      saveBatchToDirectory: (dirPath: string, batchName: string, data: string, htmlContent?: string) => Promise<{ success: boolean; filePath?: string; htmlPath?: string; error?: string }>;
    };
  }
}

