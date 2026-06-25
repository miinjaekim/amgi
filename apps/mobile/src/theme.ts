export type Theme = 'forest' | 'slate' | 'paper';

export type Palette = {
  bg: string;
  surface: string;
  text: string;
  highlight: string;
  muted: string;
  border: string;
  error: string;
};

export const THEMES: { value: Theme; label: string }[] = [
  { value: 'forest', label: 'Forest' },
  { value: 'slate', label: 'Slate' },
  { value: 'paper', label: 'Paper' },
];

export const PALETTES: Record<Theme, Palette> = {
  forest: {
    bg: '#173F35',
    surface: '#1E5246',
    text: '#E9E0D2',
    highlight: '#EAA09C',
    muted: '#418E7B',
    border: '#2D6355',
    error: '#EAA09C',
  },
  slate: {
    bg: '#111318',
    surface: '#1C1F2B',
    text: '#E2E6F3',
    highlight: '#818CF8',
    muted: '#5B6284',
    border: '#252838',
    error: '#F87171',
  },
  paper: {
    bg: '#F5F4F0',
    surface: '#FFFFFF',
    text: '#1E2235',
    highlight: '#2D6A4F',
    muted: '#94A3B8',
    border: '#D0D9D0',
    error: '#C0392B',
  },
};

// Static default — used only before ThemeContext is available
export const C = PALETTES.paper;
