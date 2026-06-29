/**
 * Achievements — a curated, evaluable catalog of milestones, each backed by REAL
 * analytics evidence + a "how you did it" takeaway. Pure logic (no React, no I/O):
 * `evaluateAchievements(stats)` decides earned/progress; per-achievement `evidence`
 * builders turn the stats + session log into proof a user can read and share. The
 * catalog data lives in `src/data/achievements.ts`.
 */
import type { ActivitySessionEvent } from './metadata';

export type AchievementGroup = 'journey' | 'habits' | 'capacities' | 'goals' | 'battles' | 'community';

/** The aggregated, real numbers every criterion + evidence builder reads. */
export interface AchievementStats {
  completions: number; // lifetime activity sessions
  daysAccomplished: number; // distinct days with ≥1 completion
  longestStreak: number; // best-ever consecutive active days
  currentStreak: number; // current global daily streak
  solidifiedCount: number; // activities at ≥21-day streak
  graduatedCount: number; // activities at ≥66-day streak
  /** The user's strongest single habit (for habit-formation evidence). */
  topActivity?: {
    id: string;
    title: string;
    streak: number;
    weeklyPct: number; // last-week consistency 0–100
    totalDays: number;
    bestWeekdayLabel?: string;
    bestHourLabel?: string;
  };
  maxCapacityLevel: number; // highest capacity ring 0–100
  maxedCapacityName?: string;
  goalsCount: number;
  battlesSlain: number;
  ritesPerformed: number;
  projectsJoined: number;
}

export interface StatLine {
  /** Key under the `achievements:stat.*` namespace. */
  labelKey: string;
  /** Pre-formatted display value (e.g. "21 days", "92%"). */
  value: string;
}

export interface EvidenceChart {
  kind: 'spark' | 'week';
  /** spark: weekly adherence 0–1; week: 7 booleans (done per day). */
  data: number[] | boolean[];
}

export interface AchievementEvidence {
  /** 1–2 marquee stats shown on the certificate. */
  headline: StatLine[];
  /** Fuller "how you did it" stat list for the detail panel. */
  detail: StatLine[];
  chart?: EvidenceChart;
}

export interface AchievementEvidenceCtx {
  stats: AchievementStats;
  sessions: readonly ActivitySessionEvent[];
  todayKey: string;
}

export interface AchievementDef {
  id: string;
  group: AchievementGroup;
  emoji: string;
  /** Decide earned + progress (0–100) from the aggregated stats. */
  criterion: (s: AchievementStats) => { earned: boolean; progressPct: number };
  /** Real-data proof + a takeaway (takeaway copy is `items.<id>.takeaway`). */
  evidence: (ctx: AchievementEvidenceCtx) => AchievementEvidence;
}

export interface AchievementState {
  def: AchievementDef;
  earned: boolean;
  progressPct: number;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Small helper for catalog criteria: earned at `goal`, progress scaled to it. */
export function threshold(value: number, goal: number): { earned: boolean; progressPct: number } {
  return { earned: value >= goal, progressPct: clampPct((value / goal) * 100) };
}

/** Evaluate the whole catalog against the user's stats. */
export function evaluateAchievements(
  catalog: readonly AchievementDef[],
  stats: AchievementStats,
): AchievementState[] {
  return catalog.map((def) => {
    const { earned, progressPct } = def.criterion(stats);
    return { def, earned, progressPct: earned ? 100 : progressPct };
  });
}

export function unlockedCount(states: readonly AchievementState[]): number {
  return states.filter((s) => s.earned).length;
}

/** Group states by their def.group, preserving catalog order within each group. */
export function groupStates(states: readonly AchievementState[]): { group: AchievementGroup; items: AchievementState[] }[] {
  const order: AchievementGroup[] = ['journey', 'habits', 'capacities', 'goals', 'battles', 'community'];
  return order
    .map((group) => ({ group, items: states.filter((s) => s.def.group === group) }))
    .filter((g) => g.items.length > 0);
}
