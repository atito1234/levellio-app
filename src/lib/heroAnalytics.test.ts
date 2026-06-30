import {
  activeDaysInWindow,
  daysAccomplished,
  directionVerdict,
  longestDayStreak,
  nextLockedTier,
  ratingStats,
  tierStatus,
  unlockedCount,
  weekCells,
  INSIGHT_TIERS,
} from './heroAnalytics';
import i18next from 'i18next';
import enMomentum from '../i18n/locales/en/momentum.json';
import type { ActivitySessionEvent } from './metadata';

// Build a session on a given local day key at noon.
const sess = (dayKey: string, activityId = 'a', rating?: 1 | 2 | 3 | 4 | 5): ActivitySessionEvent => {
  const [y, m, d] = dayKey.split('-').map(Number);
  return {
    id: `${dayKey}-${activityId}`,
    type: 'activity_session',
    createdAt: new Date(y!, m! - 1, d!, 12).getTime(),
    appVersion: 'test',
    activityId,
    method: 'manual',
    durationSec: 0,
    ...(rating ? { rating } : {}),
  };
};

describe('daysAccomplished', () => {
  it('counts distinct calendar days, not raw sessions', () => {
    const s = [sess('2026-06-01', 'a'), sess('2026-06-01', 'b'), sess('2026-06-03', 'a')];
    expect(daysAccomplished(s)).toBe(2);
  });
  it('is zero with no sessions', () => {
    expect(daysAccomplished([])).toBe(0);
  });
});

describe('longestDayStreak', () => {
  it('finds the longest consecutive run', () => {
    const s = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-05'].map((d) => sess(d));
    expect(longestDayStreak(s)).toBe(3);
  });
  it('handles a single day', () => {
    expect(longestDayStreak([sess('2026-06-01')])).toBe(1);
  });
});

describe('activeDaysInWindow', () => {
  it('counts only days inside the trailing window', () => {
    const s = ['2026-06-01', '2026-06-08', '2026-06-09', '2026-06-10'].map((d) => sess(d));
    // last 7 days ending 2026-06-10 → 06-04..06-10 → 08,09,10 = 3
    expect(activeDaysInWindow(s, '2026-06-10', 7)).toBe(3);
  });
});

describe('weekCells', () => {
  it('returns 7 cells ending today, marking active days', () => {
    const cells = weekCells([sess('2026-06-10')], '2026-06-10');
    expect(cells).toHaveLength(7);
    expect(cells[6]!.isToday).toBe(true);
    expect(cells[6]!.done).toBe(true);
    expect(cells[0]!.done).toBe(false);
  });
});

describe('directionVerdict', () => {
  it('invites a start when nothing is done', () => {
    expect(directionVerdict({ daysDone: 0, streakDays: 0, activeThisWeek: 0, activePrevWeek: 0 }).tone).toBe('start');
  });
  it('reads on-track for a healthy streak', () => {
    expect(directionVerdict({ daysDone: 10, streakDays: 4, activeThisWeek: 4, activePrevWeek: 2 }).tone).toBe('onTrack');
  });
  it('reads drifting after a quiet week with history', () => {
    expect(directionVerdict({ daysDone: 10, streakDays: 0, activeThisWeek: 0, activePrevWeek: 5 }).tone).toBe('drifting');
  });
  it('mentions the weekly trend in the reason', () => {
    expect(directionVerdict({ daysDone: 10, streakDays: 4, activeThisWeek: 5, activePrevWeek: 2 }).reason).toContain('up from last week');
  });

  it('resolves every tone via i18n without leaking a raw key', () => {
    // Guards the building-tone regression: it used plural keys (reason_one/_other)
    // the call site didn't request, so the reason rendered as "verdict.building.reason".
    const i18n = i18next.createInstance();
    void i18n.init({ lng: 'en', resources: { en: { momentum: enMomentum } }, ns: ['momentum'] });
    const t = i18n.getFixedT('en', 'momentum');
    const inputs: Parameters<typeof directionVerdict>[0][] = [
      { daysDone: 0, streakDays: 0, activeThisWeek: 0, activePrevWeek: 0 }, // start
      { daysDone: 10, streakDays: 4, activeThisWeek: 4, activePrevWeek: 2 }, // onTrack
      { daysDone: 10, streakDays: 1, activeThisWeek: 2, activePrevWeek: 1 }, // building
      { daysDone: 10, streakDays: 0, activeThisWeek: 0, activePrevWeek: 5 }, // drifting
    ];
    for (const input of inputs) {
      const v = directionVerdict(input, t as never);
      expect(v.label).not.toContain('verdict.');
      expect(v.reason).not.toContain('verdict.');
    }
  });
});

describe('ratingStats', () => {
  it('returns null when nothing is rated', () => {
    expect(ratingStats([sess('2026-06-01'), sess('2026-06-02')])).toBeNull();
  });

  it('averages ratings and ignores unrated sessions', () => {
    const s = [sess('2026-06-01', 'a', 4), sess('2026-06-02', 'a', 2), sess('2026-06-03', 'b')];
    const r = ratingStats(s)!;
    expect(r.count).toBe(2);
    expect(r.average).toBe(3);
  });

  it('detects an upward trend across the timeline', () => {
    const s = [
      sess('2026-06-01', 'a', 2),
      sess('2026-06-02', 'a', 2),
      sess('2026-06-03', 'a', 5),
      sess('2026-06-04', 'a', 5),
    ];
    expect(ratingStats(s)!.trend).toBeGreaterThan(0);
  });

  it('names the best-feeling activity (needs ≥2 ratings)', () => {
    const s = [
      sess('2026-06-01', 'a', 5),
      sess('2026-06-02', 'a', 5),
      sess('2026-06-03', 'b', 2),
      sess('2026-06-04', 'b', 2),
    ];
    expect(ratingStats(s)!.best?.activityId).toBe('a');
  });
});

describe('milestone gating', () => {
  it('locks tiers below the threshold and unlocks at/above', () => {
    const rhythm = INSIGHT_TIERS.find((t) => t.id === 'rhythm')!;
    expect(tierStatus(rhythm, 6).unlocked).toBe(false);
    expect(tierStatus(rhythm, 6).daysToGo).toBe(1);
    expect(tierStatus(rhythm, 7).unlocked).toBe(true);
  });
  it('reports the next locked tier and unlocked count', () => {
    expect(nextLockedTier(3)?.id).toBe('rhythm');
    expect(unlockedCount(3)).toBe(1);
    expect(nextLockedTier(999)).toBeNull();
    expect(unlockedCount(999)).toBe(INSIGHT_TIERS.length);
  });
});
