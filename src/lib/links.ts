/**
 * Explicit activity links — user-defined "chains" tying specific activities
 * together so they visibly power the same ripple/connections. An undirected graph
 * stored as a symmetric adjacency map (sorted, de-duped, no self-loops). Pure, no
 * I/O. Complements the implicit category→capacity ripple with intentional links.
 */
export type LinkMap = Record<string, string[]>;

/** Insert b into a's neighbour list (sorted, unique). Mutates `map`. */
function connect(map: LinkMap, a: string, b: string): void {
  const list = map[a] ?? [];
  if (!list.includes(b)) {
    list.push(b);
    list.sort();
  }
  map[a] = list;
}

/** Coerce an unknown persisted blob into a clean, symmetric LinkMap. */
export function normalizeLinks(raw: unknown): LinkMap {
  const obj = ((raw as { links?: unknown })?.links ?? raw) as Record<string, unknown> | null;
  const out: LinkMap = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [id, value] of Object.entries(obj)) {
    if (typeof id !== 'string' || !Array.isArray(value)) continue;
    for (const other of value) {
      if (typeof other !== 'string' || other === id) continue;
      connect(out, id, other);
      connect(out, other, id); // enforce symmetry
    }
  }
  return out;
}

/** Activities directly linked to `id` (sorted). */
export function neighbors(links: LinkMap, id: string): string[] {
  return links[id] ?? [];
}

export function areLinked(links: LinkMap, a: string, b: string): boolean {
  return (links[a] ?? []).includes(b);
}

/** Add an undirected link a↔b. Returns a new map (no-op for self or duplicates). */
export function addLink(links: LinkMap, a: string, b: string): LinkMap {
  if (a === b) return links;
  const next: LinkMap = {};
  for (const [k, v] of Object.entries(links)) next[k] = [...v];
  connect(next, a, b);
  connect(next, b, a);
  return next;
}

/** Remove the undirected link a↔b. Returns a new map; empty lists are dropped. */
export function removeLink(links: LinkMap, a: string, b: string): LinkMap {
  const next: LinkMap = {};
  for (const [k, v] of Object.entries(links)) {
    const filtered = v.filter((x) => !((k === a && x === b) || (k === b && x === a)));
    if (filtered.length > 0) next[k] = filtered;
  }
  return next;
}

/** The connected component containing `id` (the whole chain), sorted, incl. id. */
export function cluster(links: LinkMap, id: string): string[] {
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const n of links[cur] ?? []) {
      if (!seen.has(n)) {
        seen.add(n);
        queue.push(n);
      }
    }
  }
  return [...seen].sort();
}

/** Drop links to ids no longer present (e.g. deleted activities). Returns a new map. */
export function pruneLinks(links: LinkMap, validIds: ReadonlySet<string>): LinkMap {
  const next: LinkMap = {};
  for (const [k, v] of Object.entries(links)) {
    if (!validIds.has(k)) continue;
    const filtered = v.filter((x) => validIds.has(x));
    if (filtered.length > 0) next[k] = filtered;
  }
  return next;
}
