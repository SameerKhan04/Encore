/** Design tokens for ENCORE StyleSheet UI (PDF kit: pink / purple / gold). */

export const brand = {
  name: 'ENCORE',
  tagline: 'Your lyrics become their challenge.',
} as const;

export const colors = {
  background: '#12081F',
  surface: '#2A1545',
  text: '#E8EDF5',
  textMuted: '#B9A9D0',
  pink: '#FF4D9A',
  purple: '#9B5DE5',
  gold: '#F5C542',
  accent: '#F5C542',
  fab: '#FF4D9A',
  danger: '#E4572E',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const typography = {
  brand: 48,
  title: 24,
  body: 16,
  caption: 13,
} as const;

export type MainTab = {
  key: 'home' | 'friends' | 'play' | 'rank' | 'profile';
  title: string;
  route: 'index' | 'friends' | 'play' | 'rank' | 'profile';
  isFab?: boolean;
};

/** Bottom tabs matching the PDF shell (center mic = Play). */
export const MAIN_TABS: readonly MainTab[] = [
  { key: 'home', title: 'Home', route: 'index' },
  { key: 'friends', title: 'Friends', route: 'friends' },
  { key: 'play', title: 'Play', route: 'play', isFab: true },
  { key: 'profile', title: 'Profile', route: 'profile' },
] as const;
