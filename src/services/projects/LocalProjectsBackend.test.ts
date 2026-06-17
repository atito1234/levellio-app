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

  it('removes membership on leave', async () => {
    await backend.joinProject(ALICE, 'proj-gardens', true);
    await backend.leaveProject('alice', 'proj-gardens');
    expect(await backend.listMine('alice')).toEqual([]);
  });
});
