import { InMemoryStore } from '@/services/storage';
import { LocalProjectsBackend } from './LocalProjectsBackend';
import type { ProjectSnapshot } from './ProjectsBackend';
import { FEATURED_PROJECTS } from './featuredProjects';
import { cycleKeyFor } from '@/lib/projects';

const ALICE = { uid: 'alice', displayName: 'Alice' };
const BOB = { uid: 'bob', displayName: 'Bob' };

function nextSnap(backend: LocalProjectsBackend, projectId: string): Promise<ProjectSnapshot | null> {
  return new Promise((resolve) => {
    const unsub = backend.subscribe(projectId, 'observer', (snap) => {
      unsub();
      resolve(snap);
    });
  });
}

describe('LocalProjectsBackend', () => {
  let backend: LocalProjectsBackend;
  beforeEach(() => {
    backend = new LocalProjectsBackend(new InMemoryStore());
  });

  it('seeds the curated featured projects once', async () => {
    const featured = await backend.listFeatured();
    expect(featured).toHaveLength(FEATURED_PROJECTS.length);
    expect(featured.map((p) => p.id)).toContain('proj-malaria');
  });

  it('resolves a featured invite code', async () => {
    const project = await backend.findByInviteCode('malaria');
    expect(project?.id).toBe('proj-malaria');
    expect(await backend.findByInviteCode('NOPE99')).toBeNull();
  });

  it('joins a project, tracking membership and member count', async () => {
    await backend.joinProject(ALICE, 'proj-malaria', true);
    const mine = await backend.listMine('alice');
    expect(mine.map((p) => p.id)).toEqual(['proj-malaria']);
    expect(mine[0]!.memberCount).toBe(1);
    // Idempotent.
    await backend.joinProject(ALICE, 'proj-malaria', true);
    expect((await backend.listMine('alice'))[0]!.memberCount).toBe(1);
  });

  it('records contributions: count, member total, and feed update live', async () => {
    await backend.joinProject(ALICE, 'proj-malaria', true);
    await backend.contribute(ALICE, 'proj-malaria', { habitTitle: 'Clean a standing-water site', value: 0 });
    await backend.contribute(ALICE, 'proj-malaria', { habitTitle: 'Plant 5 seedlings', value: 5 });

    const snap = await nextSnap(backend, 'proj-malaria');
    expect(snap?.cycle.cycleKey).toBe(cycleKeyFor());
    expect(snap?.cycle.count).toBe(6); // 1 (matched suggested) + 5
    expect(snap?.members.find((m) => m.uid === 'alice')?.contributionTotal).toBe(6);
    expect(snap?.feed.map((f) => f.habitTitle).sort()).toEqual(['Clean a standing-water site', 'Plant 5 seedlings']);
  });

  it('hides a member’s feed detail when they opt out, but still counts it', async () => {
    await backend.joinProject(BOB, 'proj-malaria', false); // opted out of feed
    await backend.contribute(BOB, 'proj-malaria', { habitTitle: 'Clean a site', value: 2 });
    const snap = await nextSnap(backend, 'proj-malaria');
    expect(snap?.cycle.count).toBe(2); // counted
    expect(snap?.feed).toHaveLength(0); // but not shown
  });

  it('creates a member project with the owner auto-joined', async () => {
    const project = await backend.createProject(ALICE, {
      title: 'Beach Cleanup',
      emoji: '🏖️',
      colorId: 'sky',
      region: 'Jacmel',
      summary: 'Keep the beach clean',
      unit: 'bags',
      weeklyGoal: 25,
      reward: 'Gloves + bags',
      suggestedHabits: [],
    });
    expect(project.featured).toBe(false);
    expect(project.inviteCode).toHaveLength(6);
    const mine = await backend.listMine('alice');
    expect(mine.map((p) => p.id)).toContain(project.id);
    const snap = await nextSnap(backend, project.id);
    expect(snap?.members[0]?.role).toBe('owner');
  });

  it('returns a contribution result with live cycle progress + reward', async () => {
    await backend.joinProject(ALICE, 'proj-malaria', true);
    const res = await backend.contribute(ALICE, 'proj-malaria', { habitTitle: 'manual log', value: 3 });
    expect(res).not.toBeNull();
    expect(res!.projectId).toBe('proj-malaria');
    expect(res!.value).toBe(3);
    expect(res!.cycle.count).toBe(3);
    expect(res!.unit).toBeTruthy();
    expect(res!.reachedGoal).toBe(false);
  });

  it('flags reachedGoal only on the completion that crosses the weekly goal', async () => {
    const project = await backend.createProject(ALICE, {
      title: 'Tiny Goal',
      emoji: '🎯',
      colorId: 'teal',
      region: '',
      summary: '',
      unit: 'reps',
      weeklyGoal: 3,
      reward: 'High fives',
      suggestedHabits: [],
    });
    const r1 = await backend.contribute(ALICE, project.id, { habitTitle: 'rep', value: 2 }); // 0 -> 2
    expect(r1!.reachedGoal).toBe(false);
    const r2 = await backend.contribute(ALICE, project.id, { habitTitle: 'rep', value: 2 }); // 2 -> 4 (crosses 3)
    expect(r2!.reachedGoal).toBe(true);
    expect(r2!.reward).toBe('High fives');
    const r3 = await backend.contribute(ALICE, project.id, { habitTitle: 'rep', value: 1 }); // already past goal
    expect(r3!.reachedGoal).toBe(false);
  });

  it('returns null when contributing to a missing project', async () => {
    expect(await backend.contribute(ALICE, 'does-not-exist', { habitTitle: 'x', value: 1 })).toBeNull();
  });

  it('records and returns the contribution mode (defaults to remote)', async () => {
    await backend.joinProject(ALICE, 'proj-malaria', true);
    const onsite = await backend.contribute(ALICE, 'proj-malaria', { habitTitle: 'Clean a site', value: 1, mode: 'onsite' });
    expect(onsite!.mode).toBe('onsite');
    const def = await backend.contribute(ALICE, 'proj-malaria', { habitTitle: 'Clean a site', value: 1 });
    expect(def!.mode).toBe('remote');
    const snap = await nextSnap(backend, 'proj-malaria');
    expect(snap?.feed.some((f) => f.mode === 'onsite')).toBe(true);
  });

  it('removes membership on leave', async () => {
    await backend.joinProject(ALICE, 'proj-gardens', true);
    await backend.leaveProject('alice', 'proj-gardens');
    expect(await backend.listMine('alice')).toEqual([]);
  });
});
