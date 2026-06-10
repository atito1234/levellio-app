/**
 * Cosmetic themes (premium delight). Structured data only — selection is gated
 * by the `cosmetics` entitlement. The default theme is free; the rest are
 * premium. Visual application across avatars is a v2 polish item; today the
 * selected accent is previewed in Settings.
 */
import { colors } from '@/theme';

export interface CosmeticTheme {
  id: string;
  name: string;
  accent: string;
  premium: boolean;
}

export const DEFAULT_THEME_ID = 'classic';

export const COSMETIC_THEMES: readonly CosmeticTheme[] = [
  { id: 'classic', name: 'Classic Violet', accent: colors.identity, premium: false },
  { id: 'emerald', name: 'Emerald', accent: colors.teal, premium: true },
  { id: 'sunrise', name: 'Sunrise Gold', accent: colors.gold, premium: true },
  { id: 'midnight', name: 'Midnight', accent: '#3A2E6E', premium: true },
  { id: 'rose', name: 'Rose Quartz', accent: '#D9457E', premium: true },
];

export function getTheme(id: string): CosmeticTheme {
  return COSMETIC_THEMES.find((t) => t.id === id) ?? COSMETIC_THEMES[0]!;
}
