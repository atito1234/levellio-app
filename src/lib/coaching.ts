/**
 * Blocker coaching engine — turns a dragon (+ optional habit, goal, mood, and
 * available minutes) into a personalized, honest coaching plan: a few Socratic
 * questions and the best-matched evidence-based tactic. Pure + deterministic (a
 * seed only rotates the lead question for freshness) — no Date.now / Math.random,
 * so it's fully testable. Mirrors the ordered, first-match-wins style of
 * buildMotivation. The premium LLM layer wraps this and always falls back to it.
 */
import { habitContext, type HabitContext } from './habitContext';
import { blockersForDragon, getBlocker, GENERAL_BLOCKER_IDS, type Blocker } from '@/data/coaching/blockers';
import { getQuestion, type SocraticQuestion } from '@/data/coaching/questions';
import { getTactic, type Tactic } from '@/data/coaching/tactics';
import { getFramework } from '@/data/coaching/frameworks';
import type { JournalMood } from './journal';
import type { Goal } from './goal';
import type { Quest } from '@/types';

export interface CoachingContext {
  dragonId: string;
  /** If the user picked a specific blocker; else inferred from dragon + mood. */
  blockerId?: string;
  /** The habit in focus, for habit/goal personalization (optional). */
  quest?: Pick<Quest, 'title' | 'category' | 'why'>;
  goals: readonly Goal[];
  /** Latest mood from this dragon's journal entries (optional). */
  recentMood?: JournalMood;
  /** Minutes the user has (e.g. chosen technique length) — filters tactics. */
  minutesAvailable?: number;
  /** Deterministic rotation seed (default 0). */
  seed?: number;
}

export interface CoachingPlan {
  blocker: Blocker;
  /** 3–5 Socratic questions, most-provoking first (deduped). */
  questions: readonly SocraticQuestion[];
  /** The single best-matched recommended tactic. */
  tactic: Tactic;
  /** Ranked alternative tactics ("show me another"). */
  alternatives: readonly Tactic[];
  /** Honest evidence for the recommended tactic. */
  evidence: { principle: string; source: string };
  /** Habit/goal context when a quest is present (reuses habitContext). */
  context?: HabitContext;
  source: 'curated';
}

/** Rotate an array left by n (deterministic, pure). */
function rotate<T>(arr: readonly T[], n: number): T[] {
  if (arr.length === 0) return [];
  const k = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

/** Resolve the candidate blockers for a dragon, with a universal fallback. */
function candidateBlockers(dragonId: string): Blocker[] {
  const forDragon = blockersForDragon(dragonId);
  if (forDragon.length > 0) return [...forDragon];
  return GENERAL_BLOCKER_IDS.map(getBlocker).filter((b): b is Blocker => !!b);
}

/** Choose the blocker: explicit id wins, then a mood match, then a stable pick. */
function resolveBlocker(ctx: CoachingContext): Blocker {
  if (ctx.blockerId) {
    const explicit = getBlocker(ctx.blockerId);
    if (explicit) return explicit;
  }
  const candidates = candidateBlockers(ctx.dragonId);
  if (ctx.recentMood) {
    const moodMatch = candidates.find((b) => b.moods.includes(ctx.recentMood!));
    if (moodMatch) return moodMatch;
  }
  const seed = ctx.seed ?? 0;
  return candidates[Math.abs(Math.floor(seed)) % candidates.length]!;
}

/** Rank a blocker's tactics by time-fit then category-fit, stable by declared order. */
function rankTactics(blocker: Blocker, ctx: CoachingContext): Tactic[] {
  const tactics = blocker.tacticIds.map(getTactic).filter((t): t is Tactic => !!t);
  const score = (t: Tactic): number => {
    let s = 0;
    if (ctx.minutesAvailable == null || t.timeCostMin <= ctx.minutesAvailable) s += 2;
    const cat = ctx.quest?.category;
    if (!t.categories || t.categories.length === 0) s += 1; // universal: mild boost
    else if (cat && t.categories.includes(cat)) s += 2; // explicit match: stronger
    // else: category-specific but not a match — no boost
    return s;
  };
  return tactics
    .map((t, i) => ({ t, i, s: score(t) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.t);
}

/** Build a personalized, honest coaching plan from curated content. */
export function buildCoaching(ctx: CoachingContext): CoachingPlan {
  const blocker = resolveBlocker(ctx);

  const resolvedQuestions = blocker.questionIds
    .map(getQuestion)
    .filter((q): q is SocraticQuestion => !!q);
  const seen = new Set<string>();
  const deduped = resolvedQuestions.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
  const questions = rotate(deduped, ctx.seed ?? 0).slice(0, 5);

  const ranked = rankTactics(blocker, ctx);
  const tactic = ranked[0]!;
  const alternatives = ranked.slice(1);
  const fw = getFramework(tactic.frameworkId);

  return {
    blocker,
    questions,
    tactic,
    alternatives,
    evidence: { principle: fw.principle, source: fw.source },
    ...(ctx.quest ? { context: habitContext(ctx.quest, ctx.goals) } : {}),
    source: 'curated',
  };
}
