/**
 * Shared analytics palette + semantic maps — the single source of truth for the
 * "data / analytics" surfaces (Analytics, Insights, Progress, Monthly, Journey
 * screens + their charts). Replaces the per-screen local const blocks that each
 * redefined the same INK/BG/CARD/VIOLET/TEAL/MUTED/TRACK hexes.
 *
 * Type-only imports from lib keep this runtime-dependency-free (no cycle).
 */
import { colors } from './colors';
import type { DirectionTone } from '@/lib/heroAnalytics';
import type { JourneyStatus } from '@/lib/journey';

/** Canonical analytics palette. Pulls from theme where a token exists. */
export const A = {
  ink: colors.textPrimary,
  muted: colors.textSecondary,
  card: colors.surface,
  /** App-wide warm screen background used across every screen. */
  bg: '#F7F6F2',
  violet: colors.violet,
  violetSoft: colors.violetSoft,
  violetDeep: colors.violetDeep,
  teal: colors.teal,
  tealSoft: colors.tealSoft,
  tealDeep: colors.tealDeep,
  gold: colors.gold,
  goldDeep: colors.goldDeep,
  track: colors.track,
  lock: colors.textMuted,
} as const;

/** Per-activity habit-journey status color (graduated → gold, etc.). */
export const STATUS_COLOR: Record<JourneyStatus, string> = {
  graduated: colors.goldDeep,
  solidified: colors.teal,
  building: colors.violet,
  new: colors.textSecondary,
};

/** Momentum "are you headed the right way" verdict tones. */
export interface VerdictTone {
  accent: string;
  soft: string;
  emoji: string;
}
export const VERDICT_TONE: Record<DirectionTone, VerdictTone> = {
  onTrack: { accent: colors.teal, soft: colors.tealSoft, emoji: '🚀' },
  building: { accent: colors.violet, soft: colors.violetSoft, emoji: '📈' },
  drifting: { accent: '#B5740A', soft: '#FBEFD6', emoji: '🌱' },
  start: { accent: colors.violet, soft: colors.violetSoft, emoji: '🧭' },
};

/** 5-step teal intensity ramp (empty → peak) for heatmap-style grids. */
export const HEATMAP_SCALE = ['#ECEAE4', '#CDEDE4', '#8FE0CE', '#46CBB0', '#16C8A8'] as const;
