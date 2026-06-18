/**
 * Local persistence for the user's life goals. On-device only (KeyValueStore
 * seam); Firebase stays stubbed. Stored shape maps to a future
 * users/{uid}/goals collection. Bounded so it can't grow unbounded.
 */
import type { KeyValueStore } from '@/services/storage';
import { CATEGORY_ORDER } from '@/lib/categories';
import { GOAL_COLOR_IDS, type Goal } from '@/lib/goal';
import type { QuestCategory } from '@/types';

export const GOAL_SCHEMA_VERSION = 2;
export const MAX_GOALS = 20;

const NS = 'levellio';
const goalsKey = (uid: string) => `${NS}:goals:${uid}`;
const VALID_CATEGORIES = new Set<string>(CATEGORY_ORDER);
const VALID_COLORS = new Set<string>(GOAL_COLOR_IDS);

function normalizeGoal(raw: unknown, index: number): Goal | null {
  const g = (raw ?? {}) as Partial<Goal>;
  if (typeof g.id !== 'string' || typeof g.title !== 'string' || g.title.trim().length === 0) return null;
  const categories = Array.isArray(g.categories)
    ? (g.categories.filter((c) => typeof c === 'string' && VALID_CATEGORIES.has(c)) as QuestCategory[])
    : [];
  // Legacy goals (schema v1) have no `kind` → default to 'personal'.
  const kind: Goal['kind'] = g.kind === 'project' ? 'project' : 'personal';
  const projectId = kind === 'project' && typeof g.projectId === 'string' ? g.projectId : undefined;
  const supportingGoalIds = Array.isArray(g.supportingGoalIds)
    ? [...new Set(g.supportingGoalIds.filter((s): s is string => typeof s === 'string'))]
    : undefined;
  return {
    id: g.id,
    title: g.title.trim(),
    emoji: typeof g.emoji === 'string' && g.emoji.length > 0 ? g.emoji : '🎯',
    colorId: typeof g.colorId === 'string' && VALID_COLORS.has(g.colorId) ? g.colorId : 'violet',
    categories: [...new Set(categories)],
    createdAt: typeof g.createdAt === 'number' && Number.isFinite(g.createdAt) ? g.createdAt : 0,
    order: typeof g.order === 'number' && Number.isFinite(g.order) ? g.order : index,
    kind,
    ...(projectId ? { projectId } : {}),
    ...(supportingGoalIds && supportingGoalIds.length > 0 ? { supportingGoalIds } : {}),
  };
}

/** Coerce an unknown persisted blob into a clean, ordered Goal[]. */
export function normalizeGoals(raw: unknown): Goal[] {
  const arr = (raw as { goals?: unknown })?.goals;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((g, i) => normalizeGoal(g, i))
    .filter((g): g is Goal => g !== null)
    .sort((a, b) => a.order - b.order)
    .map((g, i) => ({ ...g, order: i }))
    .slice(0, MAX_GOALS);
}

export class GoalStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<Goal[]> {
    const raw = await this.store.getItem(goalsKey(uid));
    if (!raw) return [];
    try {
      return normalizeGoals(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async save(uid: string, goals: Goal[]): Promise<void> {
    await this.store.setItem(
      goalsKey(uid),
      JSON.stringify({ schema: GOAL_SCHEMA_VERSION, goals: goals.slice(0, MAX_GOALS) }),
    );
  }
}
