/**
 * User-facing copy for the honesty-sensitive surfaces (upgrade/paywall and the
 * Settings banners/notes). Centralized here so a single unit test can guarantee
 * we never show a phrase that claims a feature we don't actually ship in v1.0.
 *
 * Rule: keep BYO-key / on-device AI messaging (true). Never claim cloud sync,
 * accounts/sign-in, managed (no-key) cloud AI, workouts, health integrations,
 * or social features.
 */

/** Phrases that must never appear in any user-facing copy in v1.0. */
export const FORBIDDEN_USER_FACING: readonly string[] = [
  'cloud sync',
  'sync across',
  'managed cloud',
  'managed ai',
  'no-key cloud',
  'cloud account',
  'create an account',
  'sign in',
  'sign up',
  'leaderboard',
  'add friends',
  'social network',
  'health connect',
  'apple health',
  'google fit',
  'workout',
];

/** Upgrade surface (PaywallScreen) — honest "coming soon / beta" state. */
export const PAYWALL_COPY = {
  kicker: 'LEVELLIO BETA',
  heading: 'Premium is coming soon',
  freeCardTitle: 'Your plan: Free',
  comingSoonTitle: 'Premium — coming soon',
  closeLabel: 'Close',
} as const;

/** Settings banners & notes that touch monetization / AI. */
export const SETTINGS_COPY = {
  betaBannerTitle: "You're an early beta member 💜",
  betaBannerNote:
    'Levellio is completely free during the beta. There is nothing to buy, and no payment ' +
    'will ever start without your consent.',
  betaBannerCta: 'About Premium (coming soon)',
  aiSectionTitle: 'AI Quest Suggestions',
  aiSectionNote:
    'Levellio is fully usable without AI. On-device mode needs no key and no network. Cloud ' +
    'mode uses your own API key, which we never see.',
  aiOnDeviceHelp: 'Runs privately on your device. No key or network required.',
  aiNoKeyHelp: 'Prefer not to manage a key? On-device mode works with no key at all.',
} as const;

/** Throws if any string in `texts` contains a forbidden phrase (case-insensitive). */
export function findForbiddenPhrases(texts: readonly string[]): string[] {
  const hits: string[] = [];
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const phrase of FORBIDDEN_USER_FACING) {
      if (lower.includes(phrase)) hits.push(`${phrase} :: ${text}`);
    }
  }
  return hits;
}

/** All centralized copy strings, for honesty testing. */
export function allUiCopyStrings(): string[] {
  return [...Object.values(PAYWALL_COPY), ...Object.values(SETTINGS_COPY)];
}
