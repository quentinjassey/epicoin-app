import { PlatformColor, Platform } from 'react-native';

export const Colors = {
  // Labels
  label: Platform.select({
    ios: PlatformColor('label'),
    default: '#000000',
  }),
  secondaryLabel: Platform.select({
    ios: PlatformColor('secondaryLabel'),
    default: '#6B7280',
  }),
  tertiaryLabel: Platform.select({
    ios: PlatformColor('tertiaryLabel'),
    default: '#9CA3AF',
  }),
  quaternaryLabel: Platform.select({
    ios: PlatformColor('quaternaryLabel'),
    default: '#D1D5DB',
  }),

  // Backgrounds
  systemBackground: Platform.select({
    ios: PlatformColor('systemBackground'),
    default: '#FFFFFF',
  }),
  secondarySystemBackground: Platform.select({
    ios: PlatformColor('secondarySystemBackground'),
    default: '#F3F4F6',
  }),
  tertiarySystemBackground: Platform.select({
    ios: PlatformColor('tertiarySystemBackground'),
    default: '#E5E7EB',
  }),

  // Grouped backgrounds
  systemGroupedBackground: Platform.select({
    ios: PlatformColor('systemGroupedBackground'),
    default: '#F3F4F6',
  }),
  secondarySystemGroupedBackground: Platform.select({
    ios: PlatformColor('secondarySystemGroupedBackground'),
    default: '#FFFFFF',
  }),

  // Fills
  systemFill: Platform.select({
    ios: PlatformColor('systemFill'),
    default: 'rgba(120, 120, 128, 0.2)',
  }),
  secondarySystemFill: Platform.select({
    ios: PlatformColor('secondarySystemFill'),
    default: 'rgba(120, 120, 128, 0.16)',
  }),
  tertiarySystemFill: Platform.select({
    ios: PlatformColor('tertiarySystemFill'),
    default: 'rgba(120, 120, 128, 0.12)',
  }),

  // Separators
  separator: Platform.select({
    ios: PlatformColor('separator'),
    default: 'rgba(60, 60, 67, 0.29)',
  }),
  opaqueSeparator: Platform.select({
    ios: PlatformColor('opaqueSeparator'),
    default: '#C6C6C8',
  }),

  // Epitech brand colors
  epitechBlue: '#0091D3',
  epitechYellow: '#FFFC9A',

  // Status colors
  systemGreen: Platform.select({
    ios: PlatformColor('systemGreen'),
    default: '#10B981',
  }),
  systemRed: Platform.select({
    ios: PlatformColor('systemRed'),
    default: '#DC2626',
  }),
  systemOrange: Platform.select({
    ios: PlatformColor('systemOrange'),
    default: '#F59E0B',
  }),
  systemYellow: Platform.select({
    ios: PlatformColor('systemYellow'),
    default: '#FBBF24',
  }),
  systemBlue: Platform.select({
    ios: PlatformColor('systemBlue'),
    default: '#3B82F6',
  }),
  systemPurple: Platform.select({
    ios: PlatformColor('systemPurple'),
    default: '#8B5CF6',
  }),
  systemPink: Platform.select({
    ios: PlatformColor('systemPink'),
    default: '#EC4899',
  }),
  systemIndigo: Platform.select({
    ios: PlatformColor('systemIndigo'),
    default: '#6366F1',
  }),
  systemTeal: Platform.select({
    ios: PlatformColor('systemTeal'),
    default: '#14B8A6',
  }),
  systemGray: Platform.select({
    ios: PlatformColor('systemGray'),
    default: '#6B7280',
  }),

  // Alias for common usage
  success: Platform.select({
    ios: PlatformColor('systemGreen'),
    default: '#10B981',
  }),
  error: Platform.select({
    ios: PlatformColor('systemRed'),
    default: '#DC2626',
  }),
  warning: Platform.select({
    ios: PlatformColor('systemOrange'),
    default: '#F59E0B',
  }),
  info: Platform.select({
    ios: PlatformColor('systemBlue'),
    default: '#3B82F6',
  }),
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
