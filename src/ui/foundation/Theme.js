/**
 * Theme
 *
 * Single source of truth for all visual tokens used by the UI framework.
 * Derived from the palette already in use across existing popups so that
 * framework-built screens look consistent with the rest of the game.
 *
 * Usage:
 *   import { Theme } from './Theme.js';
 *   Theme.colors.bg          // 0x080f1f
 *   Theme.spacing.md         // 12
 *   Theme.radius.md          // 6
 */

export const Theme = Object.freeze({
  colors: Object.freeze({
    // Backgrounds
    bg: 0x080f1f,
    bgHeader: 0x0b1830,
    bgCard: 0x0d1a2e,
    bgPanel: 0x0d1526,
    bgOverlay: 0x000000,

    // Borders / dividers
    border: 0x2a4a8a,
    borderLight: 0x1e3050,
    divider: 0x1a2a44,

    // Text
    textBright: 0xe6e8ef,
    textDim: 0x7a86a3,
    textMuted: 0x2a3a5a,
    textSubtle: 0x4a5a7a,

    // Accent
    primary: 0x4a9eff,
    primaryDim: 0x2a5a8a,

    // Semantic
    success: 0x4ade80,
    successDim: 0x84cc16,
    warning: 0xf59e0b,
    danger: 0xef4444,
    dangerDark: 0xb91c1c,
    dangerLight: 0xf87171,

    // Special
    xp: 0x818cf8,
    salary: 0xfbbf24,
    purple: 0xc4b5fd,
  }),

  spacing: Object.freeze({
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  }),

  radius: Object.freeze({
    sm: 4,
    md: 6,
    lg: 12,
  }),

  typography: Object.freeze({
    fontFamily: 'Inter, system-ui, sans-serif',

    // Font sizes
    sizes: Object.freeze({
      xxs: 8,
      xs: 9,
      sm: 11,
      md: 13,
      lg: 15,
      xl: 18,
      xxl: 22,
      hero: 28,
    }),

    // Font weight tokens
    weights: Object.freeze({
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    }),

    // Semantic text variants: { size, weight, color }
    variants: Object.freeze({
      hero: { size: 28, weight: '700', color: 0xe6e8ef },
      title: { size: 15, weight: '700', color: 0xe6e8ef },
      subtitle: { size: 13, weight: '600', color: 0x818cf8 },
      body: { size: 13, weight: '400', color: 0xe6e8ef },
      label: { size: 11, weight: '600', color: 0x7a86a3 },
      caption: { size: 10, weight: '400', color: 0x7a86a3 },
      muted: { size: 10, weight: '400', color: 0x2a3a5a },
      sectionHeader: { size: 9, weight: '700', color: 0x4a5a7a },
    }),
  }),

  // Semi-opaque backdrop alpha
  backdropAlpha: 0.55,
});
