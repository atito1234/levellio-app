/**
 * Cloud-sync abstraction (scaffolding). Firebase/Firestore is the planned
 * provider; for now a local mock simulates push/pull/merge with no network.
 * The merge logic is pure and deterministic so it can be unit-tested.
 */
import { lifetimeXp } from '@/lib/leveling';
import type { Character, Quest } from '@/types';

export interface GameSnapshot {
  character: Character;
  quests: Quest[];
  /** Epoch millis of the last local change; used for tie-breaking. */
  updatedAt: number;
}

export interface SyncService {
  /** Upload local state (merging into any existing remote). */
  push(snapshot: GameSnapshot): Promise<void>;
  /** Download remote state, or null if none exists. */
  pull(): Promise<GameSnapshot | null>;
  /** Merge local with remote, persist the result remotely, and return it. */
  sync(local: GameSnapshot): Promise<GameSnapshot>;
}

/** Deterministic conflict resolution between two snapshots. */
export function mergeSnapshots(local: GameSnapshot, remote: GameSnapshot): GameSnapshot {
  return {
    character: pickCharacter(local.character, remote.character),
    quests: mergeQuests(local.quests, remote.quests),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}

/** Keep the more-progressed hero (lifetime XP, then streak; local wins ties). */
function pickCharacter(local: Character, remote: Character): Character {
  const localXp = lifetimeXp(local);
  const remoteXp = lifetimeXp(remote);
  if (remoteXp > localXp) return remote;
  if (localXp > remoteXp) return local;
  return remote.streakDays > local.streakDays ? remote : local;
}

/** Union quests by id; a quest completed on either side stays completed. */
function mergeQuests(local: readonly Quest[], remote: readonly Quest[]): Quest[] {
  const merged = new Map<string, Quest>();
  for (const q of local) merged.set(q.id, q);
  for (const q of remote) {
    const existing = merged.get(q.id);
    merged.set(q.id, existing ? { ...existing, completed: existing.completed || q.completed } : q);
  }
  return [...merged.values()];
}
