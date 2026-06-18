/**
 * Which of the user's own habits belong to which life goals — EXPLICIT membership
 * on top of the category-based default. A single habit may belong to several
 * goals at once (e.g. a project habit tagged into "Health" AND "Community"), and
 * because a quest has one `completed` flag, doing it once shows done across all of
 * them. Mirrors the project-links model. Pure data + helpers (no I/O); per-uid.
 */
export type GoalLinks = Record<string, string[]>; // activityId -> goalId[]

export const EMPTY_GOAL_LINKS: GoalLinks = {};

/** The goals a given habit is explicitly tagged into. */
export function goalsForHabit(links: GoalLinks, activityId: string): string[] {
  return links[activityId] ?? [];
}

export function isInGoal(links: GoalLinks, activityId: string, goalId: string): boolean {
  return goalsForHabit(links, activityId).includes(goalId);
}

/** Tag a habit into a goal (idempotent). */
export function linkGoal(links: GoalLinks, activityId: string, goalId: string): GoalLinks {
  if (isInGoal(links, activityId, goalId)) return links;
  return { ...links, [activityId]: [...goalsForHabit(links, activityId), goalId] };
}

/** Untag a habit from a goal; drops the key entirely when empty. */
export function unlinkGoal(links: GoalLinks, activityId: string, goalId: string): GoalLinks {
  const next = goalsForHabit(links, activityId).filter((id) => id !== goalId);
  const { [activityId]: _removed, ...rest } = links;
  return next.length === 0 ? rest : { ...rest, [activityId]: next };
}

/** All habit ids explicitly tagged into a goal. */
export function habitsForGoal(links: GoalLinks, goalId: string): string[] {
  return Object.keys(links).filter((activityId) => links[activityId]!.includes(goalId));
}

/** Remove all links to a goal (e.g. when the goal is deleted). */
export function unlinkGoalEverywhere(links: GoalLinks, goalId: string): GoalLinks {
  const out: GoalLinks = {};
  for (const [activityId, ids] of Object.entries(links)) {
    const kept = ids.filter((id) => id !== goalId);
    if (kept.length > 0) out[activityId] = kept;
  }
  return out;
}

/** Coerce an unknown persisted blob into a clean GoalLinks map. */
export function normalizeGoalLinks(raw: unknown): GoalLinks {
  const map = (raw as { links?: unknown })?.links;
  if (!map || typeof map !== 'object') return {};
  const out: GoalLinks = {};
  for (const [activityId, value] of Object.entries(map as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const ids = [...new Set(value.filter((v): v is string => typeof v === 'string'))];
    if (ids.length > 0) out[activityId] = ids;
  }
  return out;
}
