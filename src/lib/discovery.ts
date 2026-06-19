/**
 * Discovery/search — pure, accent-insensitive matching + ranking over people,
 * habits, and projects. Client-side (no network) — fine at alpha scale. Generic
 * over the minimal shape each result needs, so it's decoupled + unit-testable.
 */

/** Lowercase, trim, and strip diacritics (so "réseau" matches "reseau"). */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Does `text` contain `query` (normalized)? Empty query matches everything. */
export function textMatches(text: string, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return normalizeText(text).includes(q);
}

/** 0 = prefix hit, 1 = substring hit, 99 = no hit (filtered out). */
function score(text: string, normalizedQuery: string): number {
  if (!normalizedQuery) return 2;
  const n = normalizeText(text);
  if (n.startsWith(normalizedQuery)) return 0;
  if (n.includes(normalizedQuery)) return 1;
  return 99;
}

/** Filter to matches, prefix hits first, otherwise stable by original order. */
export function rankByQuery<T>(items: readonly T[], query: string, keyFn: (t: T) => string): T[] {
  const q = normalizeText(query);
  if (!q) return [...items];
  return items
    .map((it, i) => ({ it, i, s: score(keyFn(it), q) }))
    .filter((x) => x.s < 99)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.it);
}

export interface PersonLike {
  displayName: string;
}
export function searchPeople<T extends PersonLike>(people: readonly T[], query: string): T[] {
  return rankByQuery(people, query, (p) => p.displayName);
}

export interface HabitLike {
  title: string;
  description?: string;
  category: string;
}
export function searchHabits<T extends HabitLike>(habits: readonly T[], query: string, category?: string | null): T[] {
  const base = category ? habits.filter((h) => h.category === category) : habits;
  return rankByQuery(base, query, (h) => `${h.title} ${h.description ?? ''}`);
}

export interface ProjectLike {
  title: string;
  summary?: string;
  region?: string;
}
export function searchProjects<T extends ProjectLike>(projects: readonly T[], query: string): T[] {
  return rankByQuery(projects, query, (p) => `${p.title} ${p.summary ?? ''} ${p.region ?? ''}`);
}
