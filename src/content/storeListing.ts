/**
 * Store listing copy — the single source of truth for Levellio's App Store and
 * Google Play metadata. The length-constrained fields live here so a unit test
 * (and `npm run generate:listing`) can enforce character-count compliance, and
 * so an honesty guard can assert we never advertise features that aren't live.
 *
 * HONESTY RULES baked into tests (see storeListing.test.ts):
 *  - AI is on-device or bring-your-own-key only. No developer-funded "managed"
 *    cloud AI is claimed.
 *  - No cloud sync / accounts / leaderboards / social are claimed (stubbed or
 *    not built).
 *  - No Health Connect / Apple Health / Google Fit / workout tracking (v2).
 *  - The app is fully usable with zero AI (manual quests + 38-habit library).
 */

export const APP_TAGLINE = 'Real life, leveled up.';

/** Shared long-form description (used for both stores). Plain text + bullets. */
export const FULL_DESCRIPTION = `Levellio turns your real life into a solo RPG. Every habit, routine, and goal becomes a quest — complete it, earn XP, and level up a hero you make your own.

WHY LEVELLIO
• Make progress feel good. Finishing a habit triggers a real reward: XP, a rising level, and a satisfying celebration.
• Build streaks that matter. Show up day after day and watch your hero grow from Novice to Pathfinder to Luminary, with a Wisp companion that evolves alongside you.
• Choose your hero. Pick the look that feels like you and carry it through your whole journey.

START IN SECONDS — NO AI REQUIRED
You never need an AI key to get value:
• Create your own quests with a fast, simple editor.
• Add from a starter library of 38 habits across 8 areas of life: fitness, mind, learning, health, productivity, relationships, creativity, and finance.
• Optional quest suggestions can run privately, on your device.

PRIVATE BY DESIGN
Levellio is local-first. Your habits and progress live on your device — not on our servers, because we don't operate one that collects your data.
• On-device suggestions make no network calls.
• Prefer a cloud AI model? Bring your own API key. It is stored only in your device's secure keychain and used only to reach the provider you choose.
• No ads. No third-party analytics or tracking SDKs.

FREE DURING THE BETA
Levellio is completely free during the open beta — no ads, and none of the core habit-tracking features are behind a paywall. We may add optional extras in a future update, but we'll never charge you without asking first.

Real life, leveled up. Start your first quest today.`;

/** Apple App Store metadata fields. */
export const APPLE = {
  /** App name. */
  name: 'Levellio: Habit Quest RPG',
  /** Subtitle shown under the name. */
  subtitle: 'Turn habits into hero quests',
  /** Promotional text (updatable without review). */
  promotionalText:
    'Your habits, leveled up. Turn routines into quests, earn XP, and grow a hero you choose — privately, on your device. No ads, no tracking, and no AI key needed to start.',
  /** Keyword field — comma-separated, no spaces (Apple counts them). */
  keywords:
    'habit tracker,routine,gamify,streak,goals,self improvement,productivity,focus,discipline,motivation',
  /** Full description. */
  description: FULL_DESCRIPTION,
} as const;

/** Google Play Store metadata fields. */
export const PLAY = {
  /** App title. */
  title: 'Levellio: Habit Tracker RPG',
  /** Short description (high-value, indexed). */
  shortDescription: 'Turn habits into quests — earn XP, build streaks, and level up your hero.',
  /** Full description. */
  fullDescription: FULL_DESCRIPTION,
  /** Feature bullets for the listing / graphics. */
  featureBullets: [
    'Habits become quests — earn XP and level up',
    'Grow your hero: Novice → Pathfinder → Luminary',
    'A Wisp companion that evolves as you do',
    '38 starter habits across 8 areas of life',
    'Create unlimited custom quests, no AI needed',
    'Private, on-device suggestions — or bring your own AI key',
    'No ads, no tracking — local-first by design',
    'Completely free during the open beta',
  ],
} as const;

/** Release notes template for the first public version. */
export const RELEASE_NOTES_V1 = `Welcome to Levellio 1.0 — real life, leveled up.

• Turn habits, routines, and goals into quests that earn XP.
• Level up your hero from Novice to Pathfinder to Luminary, with an evolving Wisp companion.
• Start instantly: a 38-habit starter library and a simple quest creator — no AI key required.
• Private by design: local-first storage, optional on-device suggestions, or bring your own AI key.

Thanks for playing your life like the adventure it is. We'd love your feedback!`;

/** Character limits per store field. */
export const LIMITS = {
  appleName: 30,
  appleSubtitle: 30,
  applePromotionalText: 170,
  appleKeywords: 100,
  appleDescription: 4000,
  playTitle: 30,
  playShortDescription: 80,
  playFullDescription: 4000,
  releaseNotes: 4000,
} as const;

export type LimitKey = keyof typeof LIMITS;

export interface FieldReport {
  key: LimitKey;
  label: string;
  length: number;
  limit: number;
  ok: boolean;
}

/** The constrained fields paired with their limit + a human label. */
const CONSTRAINED: ReadonlyArray<{ key: LimitKey; label: string; value: string }> = [
  { key: 'appleName', label: 'Apple — App name', value: APPLE.name },
  { key: 'appleSubtitle', label: 'Apple — Subtitle', value: APPLE.subtitle },
  { key: 'applePromotionalText', label: 'Apple — Promotional text', value: APPLE.promotionalText },
  { key: 'appleKeywords', label: 'Apple — Keywords', value: APPLE.keywords },
  { key: 'appleDescription', label: 'Apple — Description', value: APPLE.description },
  { key: 'playTitle', label: 'Play — Title', value: PLAY.title },
  { key: 'playShortDescription', label: 'Play — Short description', value: PLAY.shortDescription },
  { key: 'playFullDescription', label: 'Play — Full description', value: PLAY.fullDescription },
  { key: 'releaseNotes', label: 'Release notes (v1.0.0)', value: RELEASE_NOTES_V1 },
];

/** Report length/limit/ok for every constrained field. */
export function checkFieldLengths(): FieldReport[] {
  return CONSTRAINED.map(({ key, label, value }) => {
    const limit = LIMITS[key];
    const length = [...value].length; // count code points, not UTF-16 units
    return { key, label, length, limit, ok: length <= limit };
  });
}

/** Convenience: true when every constrained field fits its limit. */
export function allFieldsWithinLimits(): boolean {
  return checkFieldLengths().every((r) => r.ok);
}
