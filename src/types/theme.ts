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

export const BLACKBOARD_THEME: ThemePalette = {
  theme: 'blackboard',
  name: 'Deep Dark Black',
  backgroundColor: '#000000',
  textColor: '#f8fafc',
  gridColor: 'transparent',
  penColors: [
    { name: 'Pure White', value: '#ffffff' },
    { name: 'Electric Cyan', value: '#00e5ff' },
    { name: 'Neon Green', value: '#00e676' },
    { name: 'Sun Yellow', value: '#ffd600' },
    { name: 'Coral Red', value: '#ff3366' },
    { name: 'Vivid Orange', value: '#ff6d00' },
    { name: 'Neon Purple', value: '#b388ff' },
    { name: 'Hot Pink', value: '#ff4081' },
  ],
  highlighterColors: [
    { name: 'Gold Glow', value: 'rgba(255, 214, 0, 0.35)' },
    { name: 'Electric Cyan', value: 'rgba(0, 229, 255, 0.35)' },
    { name: 'Neon Green', value: 'rgba(0, 230, 118, 0.35)' },
    { name: 'Coral Rose', value: 'rgba(255, 51, 102, 0.35)' },
    { name: 'Neon Violet', value: 'rgba(179, 136, 255, 0.35)' },
    { name: 'Sunset Tangerine', value: 'rgba(255, 109, 0, 0.35)' },
  ],
  overlayColors: {
    heading: 'rgba(0, 229, 255, 0.22)',
    mainHeading: 'rgba(179, 136, 255, 0.26)',
    warning: 'rgba(255, 51, 102, 0.25)',
    important: 'rgba(255, 109, 0, 0.25)',
    question: 'rgba(0, 230, 118, 0.22)',
    keyword: 'rgba(255, 214, 0, 0.25)',
    bullet: 'rgba(0, 229, 255, 0.22)',
    connector: '#00e5ff',
  },
};

// Aliased to ensure pure dark mode everywhere even if a legacy doc has 'whiteboard'
export const WHITEBOARD_THEME: ThemePalette = {
  ...BLACKBOARD_THEME,
  theme: 'whiteboard',
  name: 'Deep Dark Black',
};
