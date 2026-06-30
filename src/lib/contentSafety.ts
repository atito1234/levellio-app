/**
 * Baseline objectionable-text screen for user-generated content (posts, comments,
 * messages, profile fields, project text). Pure + dependency-free so it runs
 * client-side at post time on every UGC surface.
 *
 * This is a first line of defence, NOT a complete moderation system — the real
 * safety net is in-app reporting + auto-hide-on-threshold + the owner moderation
 * console. It deliberately targets only clearly objectionable terms (severe slurs
 * and explicit sexual/abusive language) and uses word-boundary matching plus light
 * de-obfuscation to keep false positives low (no "Scunthorpe problem").
 */

// Light leetspeak / symbol normalization so trivial obfuscation still trips the
// filter (e.g. "f4ggot", "sh1t"). Applied per-character before matching.
const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', '$': 's',
};

/**
 * Lowercase, strip accents, fold leetspeak, reduce non-alphanumerics to single
 * spaces, and collapse any repeated character run to one. The SAME normalization
 * is applied to the blocklist so "sluuut"/"sl u t"-style obfuscation still matches
 * while ordinary doubled letters never create a slur out of thin air.
 */
export function normalizeForScreen(text: string): string {
  const folded = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .split('')
    .map((c) => LEET[c] ?? c)
    .join('');
  return folded
    .replace(/[^a-z0-9]+/g, ' ') // separators \u2192 single space
    .replace(/(.)\1+/g, '$1') // collapse repeated chars (incl. doubled letters)
    .trim();
}

/**
 * Blocklist of clearly objectionable terms (severe slurs + explicit sexual/abusive
 * language). Matched on word boundaries against the normalized text. Kept compact
 * and severe on purpose; broaden over time as real reports reveal gaps.
 */
const BLOCKLIST: readonly string[] = [
  // racial / ethnic / homophobic / ableist slurs
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded', 'spic', 'chink',
  'kike', 'wetback', 'tranny', 'coon', 'gook', 'paki', 'dyke',
  // explicit sexual
  'cunt', 'whore', 'slut', 'rape', 'rapist', 'molest', 'pedophile', 'pedo',
  'cum', 'blowjob', 'handjob', 'dildo', 'porn', 'pornhub',
  // violent / self-harm targeting others
  'kill yourself', 'kys',
];

// Precompiled boundary matcher. Blocklist words are normalized the same way as
// input so collapse/leet/accents line up; multi-word phrases keep their space.
const PATTERN = new RegExp(
  `\\b(${BLOCKLIST.map((w) => normalizeForScreen(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i',
);

export interface ScreenResult {
  ok: boolean;
  /** Present when blocked — a stable reason code for analytics/telemetry. */
  reason?: 'objectionable';
}

/** Does the text contain clearly objectionable language? */
export function containsObjectionable(text: string): boolean {
  if (!text) return false;
  return PATTERN.test(normalizeForScreen(text));
}

/** Screen a piece of UGC text. `{ ok: false }` means it must not be posted. */
export function screenText(text: string): ScreenResult {
  return containsObjectionable(text) ? { ok: false, reason: 'objectionable' } : { ok: true };
}
