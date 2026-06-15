/**
 * Local persistence for earned milestones. On-device only (KeyValueStore seam);
 * Firebase stays stubbed. The id set doubles as the idempotency guard so a
 * milestone is celebrated exactly once. Bounded to keep storage small.
 */
import type { KeyValueStore } from '@/services/storage';
import type { Milestone, MilestoneKind } from '@/lib/milestones';

export const MILESTONE_SCHEMA_VERSION = 1;
export const MAX_MILESTONES = 200;

const NS = 'levellio';
const milestonesKey = (uid: string) => `${NS}:milestones:${uid}`;
const KINDS = new Set<MilestoneKind>(['streak', 'activity_solid', 'capacity_full', 'goal']);

function isMilestone(v: unknown): v is Milestone {
  const m = v as Partial<Milestone>;
  return (
    !!m &&
    typeof m.id === 'string' &&
    typeof m.label === 'string' &&
    typeof m.earnedAt === 'number' &&
    KINDS.has(m.kind as MilestoneKind)
  );
}

export function normalizeMilestones(raw: unknown): Milestone[] {
  const arr = (raw as { earned?: unknown })?.earned;
  if (!Array.isArray(arr)) return [];
  return arr.filter(isMilestone);
}

export class MilestoneStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<Milestone[]> {
    const raw = await this.store.getItem(milestonesKey(uid));
    if (!raw) return [];
    try {
      return normalizeMilestones(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async save(uid: string, earned: Milestone[]): Promise<void> {
    await this.store.setItem(
      milestonesKey(uid),
      JSON.stringify({ schema: MILESTONE_SCHEMA_VERSION, earned: earned.slice(-MAX_MILESTONES) }),
    );
  }
}
