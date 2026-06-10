import { AIUnavailableError } from './errors';
import type { HttpClient } from './AIEngine';

/**
 * Adapts the global `fetch` to our HttpClient seam. Throws if no fetch exists
 * (so cloud adapters degrade to the fallback path instead of crashing).
 */
export function fetchHttpClient(): HttpClient {
  const g = globalThis as { fetch?: typeof fetch };
  const f = g.fetch;
  if (!f) throw new AIUnavailableError('No network client available');
  return async (url, init) => {
    const res = await f(url, init);
    return { ok: res.ok, status: res.status, json: () => res.json() };
  };
}
