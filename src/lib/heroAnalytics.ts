/**
 * Hero analytics — the milestone-gated "are you headed in the right direction?"
 * layer that sits on the Hero profile. Everything is derived honestly from the
 * on-device session log; insights unlock as the user accumulates *days
 * accomplished* (distinct calendar days with a completion), so the dashboard
 * grows with real effort rather than handing everything over on day one.
 *
 * Pure (no I/O) so it's fully testable.
 */
import type { TFunction } from 'i18next';
import { dayDiff, shiftDayKey } from './dates';
import { sessionDay } from './analytics';
import type { ActivitySessionEvent } from './metadata';

// --- Days accomplished (the unlock currency) --------------------------------

/** Sorted, de-duplicated list of calendar days that have at least one session. */
export function activeDays(sessions: readonly ActivitySessionEvent[]): string[] {
  return [...new Set(sessions.map(sessionDay))].sort();
}

/** Distinct calendar days with a completion — what unlocks insights. */
export function daysAccomplished(sessions: readonly ActivitySessionEvent[]): number {
  return activeDays(sessions).length;
}

/** Longest run of consecutive calendar days with a completion. */
export function longestDayStreak(sessions: readonly ActivitySessionEvent[]): number {
  const days = activeDays(sessions);
  if (days.length === 0) return 0;
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (dayDiff(days[i - 1]!, days[i]!) === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }
  return best;
}

/** Count of distinct active days within the `length`-day window ending at `endKey`. */
export function activeDaysInWindow(
  sessions: readonly ActivitySessionEvent[],
  endKey: string,
  length: number,
): number {
  const startKey = shiftDayKey(endKey, -(length - 1));
  const days = new Set<string>();
  for (const s of sessions) {
    const d = sessionDay(s);
    if (dayDiff(startKey, d) >= 0 && dayDiff(d, endKey) >= 0) days.add(d);
  }
  return days.size;
}

// --- This week, at a glance -------------------------------------------------

export interface WeekCell {
  key: string;
  /** 0 (Sun) – 6 (Sat). */
  weekday: number;
  done: boolean;
  isToday: boolean;
}

/** The last 7 calendar days ending today, oldest first, marking which were active. */
export function weekCells(sessions: readonly ActivitySessionEvent[], todayKey: string): WeekCell[] {
  const done = new Set(sessions.map(sessionDay));
  const cells: WeekCell[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const key = shiftDayKey(todayKey, -i);
    const [y, m, d] = key.split('-').map(Number);
    cells.push({
      key,
      weekday: new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay(),
      done: done.has(key),
      isToday: i === 0,
    });
  }
  return cells;
}

// --- Direction verdict (the 3-second reflection) ----------------------------

export type DirectionTone = 'start' | 'drifting' | 'building' | 'onTrack';

export interface Direction {
  tone: DirectionTone;
  label: string;
  reason: string;
}

export interface DirectionInput {
  daysDone: number;
  /** Global daily streak from the character. */
  streakDays: number;
  /** Distinct active days in the last 7. */
  activeThisWeek: number;
  /** Distinct active days in the 7 days before that. */
  activePrevWeek: number;
}

/**
 * A quick, honest read on momentum — the headline of the dashboard.
 *
 * Pure by default: when no translator is passed the English literals are
 * returned (keeping the unit tests green). When `t` is provided the same copy is
 * sourced from the `momentum` namespace.
 */
export function directionVerdict(
  { daysDone, streakDays, activeThisWeek, activePrevWeek }: DirectionInput,
  t?: TFunction,
): Direction {
  if (daysDone === 0) {
    return {
      tone: 'start',
      label: t ? t('momentum:verdict.start.label') : 'Your map starts today',
      reason: t
        ? t('momentum:verdict.start.reason')
        : 'Complete one habit and your direction will start to take shape here.',
    };
  }

  const trendKey: 'up' | 'down' | 'same' =
    activeThisWeek > activePrevWeek ? 'up' : activeThisWeek < activePrevWeek ? 'down' : 'same';
  const trend = t
    ? t(`momentum:verdict.trend.${trendKey}`)
    : trendKey === 'up'
      ? ' — up from last week.'
      : trendKey === 'down'
        ? ' — down from last week, worth a nudge.'
        : '.';

  if (streakDays >= 3 || activeThisWeek >= 4) {
    return {
      tone: 'onTrack',
      label: t ? t('momentum:verdict.onTrack.label') : 'Headed in the right direction',
      reason: t
        ? t('momentum:verdict.onTrack.reason', { active: activeThisWeek, trend })
        : `You showed up ${activeThisWeek} of the last 7 days${trend}`,
    };
  }
  if (activeThisWeek >= 2 || streakDays >= 1) {
    return {
      tone: 'building',
      label: t ? t('momentum:verdict.building.label') : 'Building momentum',
      reason: t
        ? t('momentum:verdict.building.reason', { count: activeThisWeek, active: activeThisWeek, trend })
        : `${activeThisWeek} active ${activeThisWeek === 1 ? 'day' : 'days'} this week${trend} A little more makes it stick.`,
    };
  }
  return {
    tone: 'drifting',
    label: t ? t('momentum:verdict.drifting.label') : 'Time for a gentle nudge',
    reason: t
      ? t('momentum:verdict.drifting.reason')
      : 'It’s been quiet this week. One small win today restarts the momentum.',
  };
}

// --- Milestone-gated insight tiers ------------------------------------------

export interface InsightTier {
  id: 'streak' | 'rhythm' | 'anchor' | 'mix' | 'resilience' | 'automatic';
  /** Days accomplished required to unlock. */
  unlockDays: number;
  icon: string;
  title: string;
  /** Shown while locked — a promise of what's coming. */
  teaser: string;
}

export const INSIGHT_TIERS: readonly InsightTier[] = [
  { id: 'streak', unlockDays: 3, icon: '🔥', title: 'Streak strength', teaser: 'How many days in a row you’ve shown up.' },
  { id: 'rhythm', unlockDays: 7, icon: '⏰', title: 'Your rhythm', teaser: 'The day and time you’re most likely to show up.' },
  { id: 'anchor', unlockDays: 14, icon: '⚓', title: 'Your anchor habit', teaser: 'The habit you return to most — your foundation.' },
  { id: 'mix', unlockDays: 21, icon: '🧭', title: 'What’s working', teaser: 'Which life area is getting your energy, and the goal it feeds.' },
  { id: 'resilience', unlockDays: 30, icon: '🛡️', title: 'Your resilience', teaser: 'Your longest unbroken run — proof you can sustain it.' },
  { id: 'automatic', unlockDays: 66, icon: '🧠', title: 'Becoming automatic', teaser: 'When your habits start running on their own — the science of 66 days.' },
];

export interface TierStatus {
  unlocked: boolean;
  /** Days still needed to unlock (0 once unlocked). */
  daysToGo: number;
}

export function tierStatus(tier: InsightTier, daysDone: number): TierStatus {
  return { unlocked: daysDone >= tier.unlockDays, daysToGo: Math.max(0, tier.unlockDays - daysDone) };
}

/** The next tier still to unlock, for a "keep going" hint. Null when all unlocked. */
export function nextLockedTier(daysDone: number): InsightTier | null {
  return INSIGHT_TIERS.find((t) => daysDone < t.unlockDays) ?? null;
}

/** How many insight tiers are currently unlocked. */
export function unlockedCount(daysDone: number): number {
  return INSIGHT_TIERS.filter((t) => daysDone >= t.unlockDays).length;
}

/**
 * Localized title/teaser for a tier id. The English copy stays embedded in
 * INSIGHT_TIERS as the fallback, so render sites can pass `t` for translation
 * while the pure data array (and its tests) is left untouched.
 */
export function tierTitle(id: InsightTier['id'], t?: TFunction): string {
  const fallback = INSIGHT_TIERS.find((tier) => tier.id === id)?.title ?? '';
  return t ? t(`momentum:tier.${id}.title`) : fallback;
}

export function tierTeaser(id: InsightTier['id'], t?: TFunction): string {
  const fallback = INSIGHT_TIERS.find((tier) => tier.id === id)?.teaser ?? '';
  return t ? t(`momentum:tier.${id}.teaser`) : fallback;
}

// --- Self-reported rating insights ("how it feels") -------------------------

export interface RatingStats {
  /** Number of rated completions. */
  count: number;
  /** Mean rating across all rated completions. */
  average: number;
  /** Recent-half mean minus earlier-half mean (>0 = trending up). */
  trend: number;
  /** The activity that feels best (highest average, ≥2 ratings). */
  best?: { activityId: string; title: string; average: number; count: number };
}

function mean(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}

/**
 * Aggregate self-reported 1–5 ratings into an honest "how it feels" read.
 * Returns null when nothing has been rated yet, so the UI can hide the section.
 */
export function ratingStats(sessions: readonly ActivitySessionEvent[]): RatingStats | null {
  const rated = sessions.filter((s): s is ActivitySessionEvent & { rating: number } => typeof s.rating === 'number');
  if (rated.length === 0) return null;

  const sorted = [...rated].sort((a, b) => a.createdAt - b.createdAt);
  const mid = Math.floor(sorted.length / 2);
  const older = sorted.slice(0, mid).map((s) => s.rating);
  const newer = sorted.slice(mid).map((s) => s.rating);
  const trend = older.length && newer.length ? mean(newer) - mean(older) : 0;

  // Best-feeling activity: highest average among those rated at least twice.
  const groups = new Map<string, { title: string; values: number[] }>();
  for (const s of rated) {
    const g = groups.get(s.activityId) ?? { title: s.title ?? 'Activity', values: [] };
    g.values.push(s.rating);
    g.title = s.title ?? g.title;
    groups.set(s.activityId, g);
  }
  let best: RatingStats['best'];
  for (const [activityId, g] of groups) {
    if (g.values.length < 2) continue;
    const avg = mean(g.values);
    if (!best || avg > best.average) best = { activityId, title: g.title, average: avg, count: g.values.length };
  }

  return {
    count: rated.length,
    average: mean(rated.map((s) => s.rating)),
    trend,
    ...(best ? { best } : {}),
  };
}
