import { buildProfileSnapshot, milestoneEmoji, profileSignature, PROFILE_RECENT_MILESTONES } from './profile';
import { lifetimeXp } from './leveling';
import type { Milestone } from './milestones';
import type { Character } from '@/types';

function character(over: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    name: 'Ada',
    presentation: 'female',
    level: 9,
    xp: 50,
    streakDays: 12,
    tier: 'pathfinder',
    companionStage: 'ember',
    ...over,
  };
}

function milestone(over: Partial<Milestone> = {}): Milestone {
  return { id: 'm', kind: 'streak', label: 'Streak', earnedAt: 1, ...over };
}

describe('buildProfileSnapshot', () => {
  it('includes only public-safe fields (no private metadata)', () => {
    const p = buildProfileSnapshot({
      uid: 'u1',
      displayName: 'Ada',
      character: character(),
      milestones: [],
      projectsJoined: 2,
      now: 1000,
    });
    expect(Object.keys(p).sort()).toEqual(
      [
        'uid',
        'displayName',
        'presentation',
        'level',
        'tier',
        'lifetimeXp',
        'streakDays',
        'milestonesCount',
        'projectsJoined',
        'recentMilestones',
        'updatedAt',
      ].sort(),
    );
  });

  it('computes lifetime XP, tier, and counts', () => {
    const c = character({ level: 9, xp: 50 });
    const p = buildProfileSnapshot({ uid: 'u1', displayName: 'Ada', character: c, milestones: [milestone(), milestone({ id: 'm2' })], projectsJoined: 3 });
    expect(p.lifetimeXp).toBe(lifetimeXp(c));
    expect(p.tier).toBe('pathfinder');
    expect(p.milestonesCount).toBe(2);
    expect(p.projectsJoined).toBe(3);
  });

  it('keeps the most recent milestones, newest first, capped', () => {
    const many = Array.from({ length: 8 }, (_, i) => milestone({ id: `m${i}`, label: `L${i}`, earnedAt: i }));
    const p = buildProfileSnapshot({ uid: 'u1', displayName: 'Ada', character: character(), milestones: many, projectsJoined: 0 });
    expect(p.recentMilestones).toHaveLength(PROFILE_RECENT_MILESTONES);
    expect(p.recentMilestones[0]!.label).toBe('L7');
    expect(p.milestonesCount).toBe(8);
  });

  it('omits empty headline/country and falls back display name', () => {
    const p = buildProfileSnapshot({ uid: 'u1', displayName: '   ', character: character(), milestones: [], projectsJoined: 0, headline: '  ', country: '' });
    expect(p.headline).toBeUndefined();
    expect(p.country).toBeUndefined();
    expect(p.displayName).toBe('Hero');
  });
});

describe('milestoneEmoji', () => {
  it('uses the override when present, else a per-kind default', () => {
    expect(milestoneEmoji({ kind: 'streak', emoji: '✨' })).toBe('✨');
    expect(milestoneEmoji({ kind: 'project_goal' })).toBe('🏆');
  });
});

describe('profileSignature', () => {
  it('ignores updatedAt so identical public state has the same signature', () => {
    const base = { uid: 'u1', displayName: 'Ada', character: character(), milestones: [], projectsJoined: 1 };
    const a = buildProfileSnapshot({ ...base, now: 1 });
    const b = buildProfileSnapshot({ ...base, now: 999 });
    expect(profileSignature(a)).toBe(profileSignature(b));
  });
});
