import { colors } from './colors';
import { spacing } from './spacing';
import { radii } from './radii';
import { typography, fontSizes, fontWeights } from './typography';
import { shadows } from './shadows';

/**
 * The single strongly-typed theme object consumed across the app.
 * Import named tokens directly, or the whole `theme` for convenience.
 */
export const theme = {
  colors,
  spacing,
  radii,
  typography,
  fontSizes,
  fontWeights,
  shadows,
} as const;

export type Theme = typeof theme;

export { colors } from './colors';
export { spacing } from './spacing';
export { radii } from './radii';
export { typography, fontSizes, fontWeights } from './typography';
export { shadows } from './shadows';

export type { Colors, ColorToken } from './colors';
export type { Spacing, SpacingToken } from './spacing';
export type { Radii, RadiusToken } from './radii';
export type { Typography, TypographyToken } from './typography';
export type { Shadows, ShadowToken } from './shadows';
