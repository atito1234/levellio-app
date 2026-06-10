import {
  allFieldsWithinLimits,
  APPLE,
  checkFieldLengths,
  FULL_DESCRIPTION,
  PLAY,
  RELEASE_NOTES_V1,
} from '@/content/storeListing';

describe('store listing — character-count compliance', () => {
  it('keeps every constrained field within its store limit', () => {
    const over = checkFieldLengths().filter((r) => !r.ok);
    expect(over).toEqual([]);
    expect(allFieldsWithinLimits()).toBe(true);
  });

  it('uses the full available space sensibly (non-empty fields)', () => {
    for (const r of checkFieldLengths()) {
      expect(r.length).toBeGreaterThan(0);
    }
  });
});

describe('store listing — honesty guards (must pass review truthfully)', () => {
  // Phrases that would over-claim features that are not live today.
  const FORBIDDEN = [
    'cloud sync',
    'sync across',
    'managed cloud ai',
    'no api key', // we never claim a no-key managed model
    'leaderboard',
    'social network',
    'add friends',
    'health connect',
    'apple health',
    'google fit',
    'workout tracking',
    'track your workouts',
  ];

  const SURFACES: Array<[string, string]> = [
    ['Apple description', APPLE.description],
    ['Apple promotional text', APPLE.promotionalText],
    ['Apple keywords', APPLE.keywords],
    ['Play full description', PLAY.fullDescription],
    ['Play short description', PLAY.shortDescription],
    ['Play feature bullets', PLAY.featureBullets.join(' \n ')],
    ['Release notes', RELEASE_NOTES_V1],
  ];

  it.each(SURFACES)('%s contains no over-claiming phrases', (_label, text) => {
    const lower = text.toLowerCase();
    for (const phrase of FORBIDDEN) {
      expect(lower).not.toContain(phrase);
    }
  });

  it('states the zero-AI value (manual quests + habit library)', () => {
    expect(FULL_DESCRIPTION).toMatch(/no ai required/i);
    expect(FULL_DESCRIPTION).toContain('38 habits');
    expect(FULL_DESCRIPTION.toLowerCase()).toContain('bring your own api key');
  });

  it('frames AI as on-device or bring-your-own-key only', () => {
    expect(FULL_DESCRIPTION.toLowerCase()).toContain('on-device');
    expect(FULL_DESCRIPTION.toLowerCase()).toContain('bring your own');
  });
});
