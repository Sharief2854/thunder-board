import { BoardThemeType } from './whiteboard';

export interface ThemePalette {
  theme: BoardThemeType;
  name: string;
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  penColors: {
    name: string;
    value: string;
  }[];
  highlighterColors: {
    name: string;
    value: string;
  }[];
  overlayColors: {
    heading: string;
    mainHeading: string;
    warning: string;
    important: string;
    question: string;
    keyword: string;
    bullet: string;
    connector: string;
  };
}

export const WHITEBOARD_THEME: ThemePalette = {
  theme: 'whiteboard',
  name: 'White Board',
  backgroundColor: '#f8fafc',
  textColor: '#0f172a',
  gridColor: 'rgba(15, 23, 42, 0.06)',
  penColors: [
    { name: 'Black', value: '#1e293b' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Orange', value: '#ea580c' },
  ],
  highlighterColors: [
    { name: 'Yellow', value: 'rgba(250, 204, 21, 0.35)' },
    { name: 'Cyan', value: 'rgba(6, 182, 212, 0.35)' },
    { name: 'Green', value: 'rgba(74, 222, 128, 0.35)' },
    { name: 'Pink', value: 'rgba(244, 114, 182, 0.35)' },
  ],
  overlayColors: {
    heading: 'rgba(37, 99, 235, 0.18)',
    mainHeading: 'rgba(147, 51, 234, 0.22)',
    warning: 'rgba(220, 38, 38, 0.18)',
    important: 'rgba(234, 88, 12, 0.18)',
    question: 'rgba(13, 148, 136, 0.18)',
    keyword: 'rgba(16, 185, 129, 0.18)',
    bullet: 'rgba(59, 130, 246, 0.18)',
    connector: '#3b82f6',
  },
};

export const BLACKBOARD_THEME: ThemePalette = {
  theme: 'blackboard',
  name: 'Black Board',
  backgroundColor: '#111317',
  textColor: '#f8fafc',
  gridColor: 'transparent',
  penColors: [
    { name: 'White', value: '#f8fafc' },
    { name: 'Yellow', value: '#facc15' },
    { name: 'Cyan', value: '#38bdf8' },
    { name: 'Pink', value: '#f472b6' },
    { name: 'Green', value: '#4ade80' },
    { name: 'Orange', value: '#fb923c' },
  ],
  highlighterColors: [
    { name: 'Yellow', value: 'rgba(250, 204, 21, 0.3)' },
    { name: 'Cyan', value: 'rgba(56, 189, 248, 0.3)' },
    { name: 'Green', value: 'rgba(74, 222, 128, 0.3)' },
    { name: 'Pink', value: 'rgba(244, 114, 182, 0.3)' },
  ],
  overlayColors: {
    heading: 'rgba(56, 189, 248, 0.22)',
    mainHeading: 'rgba(192, 132, 252, 0.26)',
    warning: 'rgba(248, 113, 113, 0.25)',
    important: 'rgba(251, 146, 60, 0.25)',
    question: 'rgba(45, 212, 191, 0.22)',
    keyword: 'rgba(52, 211, 153, 0.25)',
    bullet: 'rgba(96, 165, 250, 0.22)',
    connector: '#38bdf8',
  },
};
