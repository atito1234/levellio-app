/**
 * Which of the user's own habits feed which community projects. A single habit
 * may contribute to several projects (e.g. "Clean a site" → a city project AND a
 * regional one). Mirrors the bucket "assignments" model, but many-to-many and
 * project-scoped. Pure data + helpers (no I/O); persisted per-uid on-device.
 */
export type ProjectLinks = Record<string, string[]>; // activityId -> projectId[]

export const EMPTY_PROJECT_LINKS: ProjectLinks = {};

/** The projects a given habit contributes to. */
export function linkedProjectIds(links: ProjectLinks, activityId: string): string[] {
  return links[activityId] ?? [];
}

export function isLinked(links: ProjectLinks, activityId: string, projectId: string): boolean {
  return linkedProjectIds(links, activityId).includes(projectId);
}

/** Link a habit to a project (idempotent). */
export function linkHabit(links: ProjectLinks, activityId: string, projectId: string): ProjectLinks {
  if (isLinked(links, activityId, projectId)) return links;
  return { ...links, [activityId]: [...linkedProjectIds(links, activityId), projectId] };
}

/** Unlink a habit from a project; drops the key entirely when it has no links left. */
export function unlinkHabit(links: ProjectLinks, activityId: string, projectId: string): ProjectLinks {
  const next = linkedProjectIds(links, activityId).filter((id) => id !== projectId);
  const { [activityId]: _removed, ...rest } = links;
  return next.length === 0 ? rest : { ...rest, [activityId]: next };
}

/** All habit ids that contribute to a project. */
export function habitsForProject(links: ProjectLinks, projectId: string): string[] {
  return Object.keys(links).filter((activityId) => links[activityId]!.includes(projectId));
}

/** Remove all links to a project (e.g. when the user leaves it). */
export function unlinkProject(links: ProjectLinks, projectId: string): ProjectLinks {
  const out: ProjectLinks = {};
  for (const [activityId, ids] of Object.entries(links)) {
    const kept = ids.filter((id) => id !== projectId);
    if (kept.length > 0) out[activityId] = kept;
  }
  return out;
}

/** Coerce an unknown persisted blob into a clean ProjectLinks map. */
export function normalizeLinks(raw: unknown): ProjectLinks {
  const map = (raw as { links?: unknown })?.links;
  if (!map || typeof map !== 'object') return {};
  const out: ProjectLinks = {};
  for (const [activityId, value] of Object.entries(map as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const ids = [...new Set(value.filter((v): v is string => typeof v === 'string'))];
    if (ids.length > 0) out[activityId] = ids;
  }
  return out;
}
