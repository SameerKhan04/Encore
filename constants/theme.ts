/** Design tokens for ENCORE StyleSheet UI. */

export const brand = {
  name: 'ENCORE',
  tagline: 'Your lyrics become their challenge.',
} as const;

export const colors = {
  background: '#0B0E14',
  surface: '#151A24',
  text: '#E8EDF5',
  textMuted: '#9AA3B5',
  accent: '#F0A202',
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
