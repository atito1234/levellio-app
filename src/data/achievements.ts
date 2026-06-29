/**
 * The curated Achievements catalog. Each entry decides when it's earned and builds
 * real analytics evidence + (via i18n `items.<id>.takeaway`) a "how you did it"
 * lesson. Titles/descriptions/takeaways live in the `achievements` i18n namespace
 * keyed by id. Pure data — see src/lib/achievements.ts for the engine.
 */
import { threshold, type AchievementDef, type StatLine, type AchievementEvidenceCtx } from '@/lib/achievements';
import { weekCells } from '@/lib/heroAnalytics';
import { activityWeeklyAdherence } from '@/lib/journey';

const days = (n: number) => `${n}d`;
const pct = (n: number) => `${Math.round(n)}%`;

/** Common journey/streak evidence: streak headline + shown-up detail + week heatmap. */
function streakEvidence(ctx: AchievementEvidenceCtx): ReturnType<AchievementDef['evidence']> {
  const s = ctx.stats;
  const headline: StatLine[] = [{ labelKey: 'stat.bestStreak', value: days(s.longestStreak) }];
  const detail: StatLine[] = [
    { labelKey: 'stat.daysShownUp', value: `${s.daysAccomplished}` },
    { labelKey: 'stat.currentStreak', value: days(s.currentStreak) },
  ];
  if (s.topActivity?.bestWeekdayLabel) detail.push({ labelKey: 'stat.bestDay', value: s.topActivity.bestWeekdayLabel });
  return { headline, detail, chart: { kind: 'week', data: weekCells(ctx.sessions, ctx.todayKey).map((c) => c.done) } };
}

/** Habit-formation evidence anchored on the user's strongest habit. */
function habitEvidence(ctx: AchievementEvidenceCtx): ReturnType<AchievementDef['evidence']> {
  const ta = ctx.stats.topActivity;
  if (!ta) return { headline: [{ labelKey: 'stat.habitsFormed', value: `${ctx.stats.solidifiedCount}` }], detail: [] };
  const headline: StatLine[] = [
    { labelKey: 'stat.streak', value: days(ta.streak) },
    { labelKey: 'stat.consistency', value: pct(ta.weeklyPct) },
  ];
  const detail: StatLine[] = [{ labelKey: 'stat.totalReps', value: `${ta.totalDays}` }];
  if (ta.bestWeekdayLabel) detail.push({ labelKey: 'stat.bestDay', value: ta.bestWeekdayLabel });
  if (ta.bestHourLabel) detail.push({ labelKey: 'stat.bestTime', value: ta.bestHourLabel });
  return { headline, detail, chart: { kind: 'spark', data: activityWeeklyAdherence(ctx.sessions, ta.id, ctx.todayKey, 8) } };
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ── Journey ──────────────────────────────────────────────────────────────
  {
    id: 'first-step', group: 'journey', emoji: '🌱',
    criterion: (s) => threshold(s.completions, 1),
    evidence: (ctx) => ({
      headline: [{ labelKey: 'stat.reps', value: `${ctx.stats.completions}` }],
      detail: [{ labelKey: 'stat.daysShownUp', value: `${ctx.stats.daysAccomplished}` }],
    }),
  },
  {
    id: 'rhythm-3', group: 'journey', emoji: '🎵',
    criterion: (s) => threshold(s.longestStreak, 3),
    evidence: streakEvidence,
  },
  {
    id: 'two-weeks-14', group: 'journey', emoji: '📅',
    criterion: (s) => threshold(s.longestStreak, 14),
    evidence: streakEvidence,
  },
  {
    id: 'resilient-30', group: 'journey', emoji: '🛡️',
    criterion: (s) => threshold(s.longestStreak, 30),
    evidence: streakEvidence,
  },
  // ── Habits formed ────────────────────────────────────────────────────────
  {
    id: 'locked-in', group: 'habits', emoji: '🌳',
    criterion: (s) => (s.solidifiedCount >= 1 ? { earned: true, progressPct: 100 } : threshold(s.topActivity?.streak ?? 0, 21)),
    evidence: habitEvidence,
  },
  {
    id: 'automatic-66', group: 'habits', emoji: '🏅',
    criterion: (s) => (s.graduatedCount >= 1 ? { earned: true, progressPct: 100 } : threshold(s.topActivity?.streak ?? 0, 66)),
    evidence: habitEvidence,
  },
  {
    id: 'habit-collector', group: 'habits', emoji: '🌿',
    criterion: (s) => threshold(s.solidifiedCount, 3),
    evidence: (ctx) => ({
      headline: [{ labelKey: 'stat.habitsFormed', value: `${ctx.stats.solidifiedCount}` }],
      detail: [{ labelKey: 'stat.daysShownUp', value: `${ctx.stats.daysAccomplished}` }],
    }),
  },
  // ── Capacities ───────────────────────────────────────────────────────────
  {
    id: 'fully-charged', group: 'capacities', emoji: '⚡',
    criterion: (s) => threshold(s.maxCapacityLevel, 100),
    evidence: (ctx) => ({
      headline: [
        { labelKey: 'stat.capacity', value: ctx.stats.maxedCapacityName ?? '—' },
        { labelKey: 'stat.level', value: pct(ctx.stats.maxCapacityLevel) },
      ],
      detail: [{ labelKey: 'stat.daysShownUp', value: `${ctx.stats.daysAccomplished}` }],
    }),
  },
  // ── Goals ────────────────────────────────────────────────────────────────
  {
    id: 'goal-setter', group: 'goals', emoji: '🎯',
    criterion: (s) => threshold(s.goalsCount, 1),
    evidence: (ctx) => ({
      headline: [{ labelKey: 'stat.goals', value: `${ctx.stats.goalsCount}` }],
      detail: [{ labelKey: 'stat.daysShownUp', value: `${ctx.stats.daysAccomplished}` }],
    }),
  },
  // ── Battles ──────────────────────────────────────────────────────────────
  {
    id: 'dragon-slayer', group: 'battles', emoji: '⚔️',
    criterion: (s) => threshold(s.battlesSlain, 1),
    evidence: (ctx) => ({
      headline: [{ labelKey: 'stat.slain', value: `${ctx.stats.battlesSlain}` }],
      detail: [{ labelKey: 'stat.rites', value: `${ctx.stats.ritesPerformed}` }],
    }),
  },
  {
    id: 'dragon-hunter', group: 'battles', emoji: '🐉',
    criterion: (s) => threshold(s.battlesSlain, 10),
    evidence: (ctx) => ({
      headline: [{ labelKey: 'stat.slain', value: `${ctx.stats.battlesSlain}` }],
      detail: [{ labelKey: 'stat.rites', value: `${ctx.stats.ritesPerformed}` }],
    }),
  },
  {
    id: 'prepared-mind', group: 'battles', emoji: '🧘',
    criterion: (s) => threshold(s.ritesPerformed, 1),
    evidence: (ctx) => ({
      headline: [{ labelKey: 'stat.rites', value: `${ctx.stats.ritesPerformed}` }],
      detail: [{ labelKey: 'stat.slain', value: `${ctx.stats.battlesSlain}` }],
    }),
  },
  // ── Community ────────────────────────────────────────────────────────────
  {
    id: 'team-player', group: 'community', emoji: '🤝',
    criterion: (s) => threshold(s.projectsJoined, 1),
    evidence: (ctx) => ({
      headline: [{ labelKey: 'stat.projects', value: `${ctx.stats.projectsJoined}` }],
      detail: [{ labelKey: 'stat.daysShownUp', value: `${ctx.stats.daysAccomplished}` }],
    }),
  },
];
