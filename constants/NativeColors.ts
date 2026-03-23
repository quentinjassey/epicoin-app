import { Platform } from 'react-native';

// ── Epitech Brand Palette — Light Brutalist ─────────────
export const Colors = {
  // ── Brand ──
  epitechBlue: '#013AFB',
  neonGreen: '#00ff97',
  accentOrange: '#ff5a3a',
  accentMagenta: '#ff1ef7',

  // ── Neutrals ──
  black: '#181818',
  darkGray: '#313131',
  mediumGray: '#555555',
  lightGray: '#eeeeee',
  offWhite: '#F2F4F8',
  white: '#FFFFFF',

  // ── Labels ──
  label: '#181818',
  secondaryLabel: '#555555',
  tertiaryLabel: '#999999',
  quaternaryLabel: '#CCCCCC',

  // ── Backgrounds ──
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F4F8',
  tertiarySystemBackground: '#E8EAEF',

  // ── Grouped backgrounds ──
  systemGroupedBackground: '#F2F4F8',
  secondarySystemGroupedBackground: '#FFFFFF',

  // ── Fills ──
  systemFill: 'rgba(0, 0, 0, 0.05)',
  secondarySystemFill: 'rgba(0, 0, 0, 0.04)',
  tertiarySystemFill: 'rgba(0, 0, 0, 0.03)',

  // ── Separators ──
  separator: 'rgba(0, 0, 0, 0.1)',
  opaqueSeparator: '#D0D0D0',

  // ── Status colors ──
  systemGreen: '#00C853',
  systemRed: '#ff5a3a',
  systemOrange: '#F59E0B',
  systemYellow: '#FBBF24',
  systemBlue: '#013AFB',
  systemPurple: '#ff1ef7',
  systemPink: '#ff1ef7',
  systemIndigo: '#013AFB',
  systemTeal: '#00C853',
  systemGray: '#555555',

  // ── Aliases ──
  success: '#00C853',
  error: '#ff5a3a',
  warning: '#F59E0B',
  info: '#013AFB',

  // Legacy alias
  epitechYellow: '#00ff97',
};

// Helper function to get color with opacity
export const colorWithOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
};
