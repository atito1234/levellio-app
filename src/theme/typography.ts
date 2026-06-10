import type { TextStyle } from 'react-native';

/**
 * Typography tokens. Uses the platform system font by default so the app has
 * zero font-asset dependencies; swap `fontFamily` here when brand fonts land.
 */
export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const fontSizes = {
  caption: 12,
  body: 16,
  label: 14,
  title: 20,
  heading: 26,
  display: 34,
} as const;

/** Ready-to-spread text styles. */
export const typography = {
  display: {
    fontSize: fontSizes.display,
    fontWeight: fontWeights.bold,
    lineHeight: 40,
  },
  heading: {
    fontSize: fontSizes.heading,
    fontWeight: fontWeights.bold,
    lineHeight: 32,
  },
  title: {
    fontSize: fontSizes.title,
    fontWeight: fontWeights.semibold,
    lineHeight: 26,
  },
  body: {
    fontSize: fontSizes.body,
    fontWeight: fontWeights.regular,
    lineHeight: 22,
  },
  label: {
    fontSize: fontSizes.label,
    fontWeight: fontWeights.semibold,
    lineHeight: 18,
  },
  caption: {
    fontSize: fontSizes.caption,
    fontWeight: fontWeights.medium,
    lineHeight: 16,
  },
} as const satisfies Record<string, TextStyle>;

export type Typography = typeof typography;
export type TypographyToken = keyof Typography;
