/**
 * Corner radius tokens. `pill` and `round` are intentionally large.
 */
export const radii = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
  round: 9999,
} as const;

export type Radii = typeof radii;
export type RadiusToken = keyof Radii;
