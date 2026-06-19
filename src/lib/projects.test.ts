import {
  cycleEndLabel,
  cycleKeyFor,
  cycleProgress,
  contributionValue,
  daysLeftInCycle,
  genInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
  progressPct,
  summarizeFeed,
  validateProjectDraft,
  type Contribution,
} from './projects';

describe('weekly cycle', () => {
  it('keys all days of one Sun–Sat week to the same Sunday', () => {
    const sun = new Date(2026, 5, 14); // Sun Jun 14 2026
    const wed = new Date(2026, 5, 17);
    const sat = new Date(2026, 5, 20);
    expect(cycleKeyFor(sun)).toBe('wk-2026-06-14');
    expect(cycleKeyFor(wed)).toBe('wk-2026-06-14');
    expect(cycleKeyFor(sat)).toBe('wk-2026-06-14');
    // The next day (Sunday) starts a new cycle.
    expect(cycleKeyFor(new Date(2026, 5, 21))).toBe('wk-2026-06-21');
  });

  it('counts days left inclusive of today', () => {
    expect(daysLeftInCycle(new Date(2026, 5, 14))).toBe(7); // Sunday
    expect(daysLeftInCycle(new Date(2026, 5, 20))).toBe(1); // Saturday
    expect(cycleEndLabel(new Date(2026, 5, 20))).toBe('resets tomorrow');
    expect(cycleEndLabel(new Date(2026, 5, 17))).toBe('4 days left');
  });
});

describe('progress', () => {
  it('clamps to 0..100', () => {
    expect(progressPct(0, 10)).toBe(0);
    expect(progressPct(5, 10)).toBe(50);
    expect(progressPct(20, 10)).toBe(100);
    expect(progressPct(5, 0)).toBe(0);
  });

  it('builds a clean cycle view-model', () => {
    expect(cycleProgress('wk-x', 6.4, 10)).toEqual({ cycleKey: 'wk-x', count: 6, goal: 10, pct: 60 });
    expect(cycleProgress('wk-x', -3, 10).count).toBe(0);
  });
});

describe('invite codes', () => {
  it('generates valid fixed-length codes from the unambiguous alphabet', () => {
    const code = genInviteCode(() => 0); // first letter repeated
    expect(code).toHaveLength(6);
    expect(code).toBe('AAAAAA');
    expect(isValidInviteCode(code)).toBe(true);
  });

  it('normalizes typed/shared codes (uppercase, keep A–Z & 0–9, strip the rest)', () => {
    expect(normalizeInviteCode('k7m2qp')).toBe('K7M2QP');
    expect(normalizeInviteCode('  K7-M2 QP ')).toBe('K7M2QP');
    // Real-word codes keep their letters (including I/L/O/U).
    expect(normalizeInviteCode('  mal-aria ')).toBe('MALARIA');
    expect(isValidInviteCode('MALARIA')).toBe(true);
    // A pasted share link normalizes down to just the code.
    expect(normalizeInviteCode('levellio://join/CLEANH2O')).toBe('CLEANH2O');
    expect(normalizeInviteCode('CLEANH2O')).toBe('CLEANH2O');
    expect(isValidInviteCode('CLEANH2O')).toBe(true);
  });

  it('rejects codes that are too short', () => {
    expect(isValidInviteCode('AB')).toBe(false);
    expect(isValidInviteCode('')).toBe(false);
    expect(isValidInviteCode('ABCD')).toBe(true);
  });
});

describe('contribution value', () => {
  const project = {
    suggestedHabits: [
      { title: 'Clean a standing-water site', category: 'health' as const, contribution: 1 },
      { title: 'Plant 5 seedlings', category: 'health' as const, contribution: 5 },
    ],
  };

  it('uses a suggested habit’s declared contribution (case-insensitive)', () => {
    expect(contributionValue('plant 5 seedlings', project)).toBe(5);
    expect(contributionValue('Clean a standing-water site', project)).toBe(1);
  });

  it('defaults unknown habits to 1', () => {
    expect(contributionValue('Random habit', project)).toBe(1);
  });
});

describe('feed', () => {
  const c = (id: string, createdAt: number): Contribution => ({
    id,
    uid: 'u',
    displayName: 'Marie',
    habitTitle: 'Clean site',
    value: 1,
    cycleKey: 'wk-x',
    createdAt,
  });

  it('returns most-recent-first, bounded', () => {
    const feed = summarizeFeed([c('a', 1), c('b', 3), c('c', 2)], 2);
    expect(feed.map((f) => f.id)).toEqual(['b', 'c']);
  });
});

describe('project validation', () => {
  it('requires a name, a unit, and a positive goal', () => {
    expect(validateProjectDraft({ title: '', unit: 'sites', weeklyGoal: 10 }).valid).toBe(false);
    expect(validateProjectDraft({ title: 'Clean Water', unit: '', weeklyGoal: 10 }).valid).toBe(false);
    expect(validateProjectDraft({ title: 'Clean Water', unit: 'sites', weeklyGoal: 0 }).valid).toBe(false);
    expect(validateProjectDraft({ title: 'Clean Water', unit: 'sites', weeklyGoal: 10 }).valid).toBe(true);
  });
});
