/**
 * Public profile snapshot — the small, public-SAFE projection of a user that
 * other people may read (so they can learn from each other). It deliberately
 * carries ONLY shareable fields: identity, level/tier, streak, lifetime XP, and
 * recent milestones. It never includes habit-formation metadata, location, or
 * any private setting. No I/O — pure + unit-testable.
 */
import { lifetimeXp, tierForLevel } from './leveling';
import type { Milestone, MilestoneKind } from './milestones';
import type { Character, HeroPresentation, HeroTier } from '@/types';

/** A compact milestone for the profile strip. */
export interface ProfileMilestone {
  emoji: string;
  label: string;
  earnedAt: number;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
  /** Optional self-authored one-liner (LinkedIn-style headline). */
  headline?: string;
  /** Optional free-text location/country. */
  country?: string;
  level: number;
  tier: HeroTier;
  lifetimeXp: number;
  streakDays: number;
  milestonesCount: number;
  projectsJoined: number;
  recentMilestones: ProfileMilestone[];
  updatedAt: number;
}

/** How many recent milestones to surface on a profile. */
export const PROFILE_RECENT_MILESTONES = 5;

const MILESTONE_EMOJI: Record<MilestoneKind, string> = {
  streak: '🔥',
  activity_solid: '🌱',
  capacity_full: '💪',
  goal: '🎯',
  project: '🤝',
  project_goal: '🏆',
  dragon: '⚔️',
};

/** A display emoji for a milestone (its override, else a per-kind default). */
export function milestoneEmoji(m: Pick<Milestone, 'kind' | 'emoji'>): string {
  return m.emoji ?? MILESTONE_EMOJI[m.kind] ?? '⭐';
}

export interface ProfileSnapshotInput {
  uid: string;
  displayName: string;
  character: Pick<Character, 'presentation' | 'level' | 'xp' | 'tier' | 'streakDays'>;
  milestones: readonly Milestone[];
  projectsJoined: number;
  headline?: string;
  country?: string;
  now?: number;
}

/** Assemble the public-safe snapshot from the viewer's own local state. */
export function buildProfileSnapshot(input: ProfileSnapshotInput): PublicProfile {
  const { uid, displayName, character, milestones, projectsJoined } = input;
  const recent = [...milestones]
    .sort((a, b) => b.earnedAt - a.earnedAt)
    .slice(0, PROFILE_RECENT_MILESTONES)
    .map((m) => ({ emoji: milestoneEmoji(m), label: m.label, earnedAt: m.earnedAt }));

  const headline = input.headline?.trim();
  const country = input.country?.trim();

  return {
    uid,
    displayName: displayName.trim() || 'Hero',
    ...(character.presentation ? { presentation: character.presentation } : {}),
    ...(headline ? { headline } : {}),
    ...(country ? { country } : {}),
    level: character.level,
    tier: character.tier ?? tierForLevel(character.level),
    lifetimeXp: lifetimeXp(character),
    streakDays: character.streakDays,
    milestonesCount: milestones.length,
    projectsJoined,
    recentMilestones: recent,
    updatedAt: input.now ?? Date.now(),
  };
}

/** A stable signature of the public fields, to avoid redundant re-publishes. */
export function profileSignature(p: PublicProfile): string {
  return JSON.stringify({
    displayName: p.displayName,
    presentation: p.presentation,
    headline: p.headline,
    country: p.country,
    level: p.level,
    tier: p.tier,
    lifetimeXp: p.lifetimeXp,
    streakDays: p.streakDays,
    milestonesCount: p.milestonesCount,
    projectsJoined: p.projectsJoined,
    recentMilestones: p.recentMilestones,
  });
}
