/**
 * Local, on-device implementation of ProjectsBackend (KeyValueStore seam). Fully
 * offline and single-device: contributions, members, and the activity feed live
 * in AsyncStorage. Featured projects are seeded on first use. Live updates are
 * delivered to in-process subscribers so the UI feels realtime within the
 * device. Cross-device realtime arrives by swapping in FirebaseProjectsBackend.
 */
import type { KeyValueStore } from '@/services/storage';
import {
  contributionValue,
  cycleKeyFor,
  cycleProgress,
  genInviteCode,
  normalizeInviteCode,
  progressPct,
  summarizeFeed,
  type Contribution,
  type ContributionMode,
  type Project,
  type ProjectMember,
} from '@/lib/projects';
import { FEATURED_PROJECTS } from './featuredProjects';
import type {
  ContributionInput,
  ContributionResult,
  ProjectDraft,
  ProjectIdentity,
  ProjectSnapshot,
  ProjectsBackend,
  Unsubscribe,
} from './ProjectsBackend';

const NS = 'levellio:projects';
const ALL_KEY = `${NS}:all`;
const SEED_KEY = `${NS}:seeded`;
const membersKey = (pid: string) => `${NS}:members:${pid}`;
const contribKey = (pid: string) => `${NS}:contributions:${pid}`;
const mineKey = (uid: string) => `${NS}:mine:${uid}`;

let seq = 0;
const genId = (prefix: string) => `${prefix}-${Date.now()}-${(seq += 1)}`;

export class LocalProjectsBackend implements ProjectsBackend {
  readonly isShared = false;
  private readonly listeners = new Map<string, Set<(snap: ProjectSnapshot | null) => void>>();
  private seeding: Promise<void> | null = null;

  constructor(private readonly store: KeyValueStore) {}

  // --- persistence helpers ---------------------------------------------------

  private async read<T>(key: string, fallback: T): Promise<T> {
    const raw = await this.store.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private write<T>(key: string, value: T): Promise<void> {
    return this.store.setItem(key, JSON.stringify(value));
  }

  /** Seed the curated featured projects exactly once. */
  private async ensureSeeded(): Promise<void> {
    if (this.seeding) return this.seeding;
    this.seeding = (async () => {
      if (await this.store.getItem(SEED_KEY)) return;
      const now = Date.now();
      const projects: Project[] = FEATURED_PROJECTS.map((seed) => ({
        id: seed.id,
        title: seed.title,
        emoji: seed.emoji,
        colorId: seed.colorId,
        region: seed.region,
        summary: seed.summary,
        unit: seed.unit,
        weeklyGoal: seed.weeklyGoal,
        featured: true,
        ownerUid: 'levellio',
        inviteCode: seed.inviteCode,
        suggestedHabits: seed.suggestedHabits,
        reward: seed.reward,
        memberCount: 0,
        createdAt: now,
        ...(typeof seed.lat === 'number' ? { lat: seed.lat } : {}),
        ...(typeof seed.lng === 'number' ? { lng: seed.lng } : {}),
        ...(typeof seed.radiusKm === 'number' ? { radiusKm: seed.radiusKm } : {}),
      }));
      await this.write(ALL_KEY, projects);
      await this.store.setItem(SEED_KEY, '1');
    })();
    return this.seeding;
  }

  private async allProjects(): Promise<Project[]> {
    await this.ensureSeeded();
    return this.read<Project[]>(ALL_KEY, []);
  }

  private async saveProject(project: Project): Promise<void> {
    const all = await this.allProjects();
    const idx = all.findIndex((p) => p.id === project.id);
    if (idx >= 0) all[idx] = project;
    else all.push(project);
    await this.write(ALL_KEY, all);
  }

  // --- queries ---------------------------------------------------------------

  async listFeatured(): Promise<Project[]> {
    return (await this.allProjects()).filter((p) => p.featured);
  }

  async listMine(uid: string): Promise<Project[]> {
    const mine = new Set(await this.read<string[]>(mineKey(uid), []));
    return (await this.allProjects()).filter((p) => mine.has(p.id));
  }

  async findByInviteCode(code: string): Promise<Project | null> {
    const norm = normalizeInviteCode(code);
    if (norm.length === 0) return null;
    return (await this.allProjects()).find((p) => normalizeInviteCode(p.inviteCode) === norm) ?? null;
  }

  // --- mutations -------------------------------------------------------------

  async createProject(identity: ProjectIdentity, draft: ProjectDraft): Promise<Project> {
    const project: Project = {
      id: genId('proj'),
      title: draft.title.trim(),
      emoji: draft.emoji,
      colorId: draft.colorId,
      region: draft.region.trim(),
      summary: draft.summary.trim(),
      unit: draft.unit.trim(),
      weeklyGoal: Math.max(1, Math.round(draft.weeklyGoal)),
      featured: false,
      ownerUid: identity.uid,
      inviteCode: genInviteCode(),
      suggestedHabits: draft.suggestedHabits,
      reward: draft.reward.trim(),
      memberCount: 0,
      createdAt: Date.now(),
      ...(typeof draft.lat === 'number' ? { lat: draft.lat } : {}),
      ...(typeof draft.lng === 'number' ? { lng: draft.lng } : {}),
      ...(typeof draft.radiusKm === 'number' ? { radiusKm: draft.radiusKm } : {}),
    };
    await this.saveProject(project);
    await this.joinProject(identity, project.id, true, 'owner');
    return project;
  }

  async joinProject(
    identity: ProjectIdentity,
    projectId: string,
    shareFeed: boolean,
    role: 'owner' | 'member' = 'member',
  ): Promise<Project | null> {
    const all = await this.allProjects();
    const project = all.find((p) => p.id === projectId);
    if (!project) return null;

    const members = await this.read<ProjectMember[]>(membersKey(projectId), []);
    if (!members.some((m) => m.uid === identity.uid)) {
      members.push({
        uid: identity.uid,
        displayName: identity.displayName,
        presentation: identity.presentation,
        role,
        joinedAt: Date.now(),
        shareFeed,
        contributionTotal: 0,
      });
      await this.write(membersKey(projectId), members);
      project.memberCount = members.length;
      await this.saveProject(project);

      const mine = new Set(await this.read<string[]>(mineKey(identity.uid), []));
      mine.add(projectId);
      await this.write(mineKey(identity.uid), [...mine]);
    }
    await this.notify(projectId);
    return project;
  }

  async leaveProject(uid: string, projectId: string): Promise<void> {
    const members = (await this.read<ProjectMember[]>(membersKey(projectId), [])).filter((m) => m.uid !== uid);
    await this.write(membersKey(projectId), members);
    const mine = (await this.read<string[]>(mineKey(uid), [])).filter((id) => id !== projectId);
    await this.write(mineKey(uid), mine);
    const all = await this.allProjects();
    const project = all.find((p) => p.id === projectId);
    if (project) {
      project.memberCount = members.length;
      await this.saveProject(project);
    }
    await this.notify(projectId);
  }

  async setShareFeed(uid: string, projectId: string, shareFeed: boolean): Promise<void> {
    const members = await this.read<ProjectMember[]>(membersKey(projectId), []);
    const member = members.find((m) => m.uid === uid);
    if (!member) return;
    member.shareFeed = shareFeed;
    await this.write(membersKey(projectId), members);
    await this.notify(projectId);
  }

  async contribute(
    identity: ProjectIdentity,
    projectId: string,
    input: ContributionInput,
  ): Promise<ContributionResult | null> {
    const project = (await this.allProjects()).find((p) => p.id === projectId);
    if (!project) return null;
    const value = Math.max(1, Math.round(input.value || contributionValue(input.habitTitle, project)));
    const mode: ContributionMode = input.mode ?? 'remote';
    const key = cycleKeyFor();

    const contributions = await this.read<Contribution[]>(contribKey(projectId), []);
    // Cycle total before this contribution — to detect the goal-crossing moment.
    const prevCount = contributions
      .filter((c) => c.cycleKey === key)
      .reduce((sum, c) => sum + c.value, 0);
    contributions.push({
      id: genId('c'),
      uid: identity.uid,
      displayName: identity.displayName,
      habitTitle: input.habitTitle,
      category: input.category,
      value,
      mode,
      cycleKey: key,
      createdAt: Date.now(),
    });
    await this.write(contribKey(projectId), contributions.slice(-500));

    const members = await this.read<ProjectMember[]>(membersKey(projectId), []);
    const member = members.find((m) => m.uid === identity.uid);
    if (member) {
      member.contributionTotal += value;
      await this.write(membersKey(projectId), members);
    }
    await this.notify(projectId);

    const cycle = cycleProgress(key, prevCount + value, project.weeklyGoal);
    return {
      projectId,
      title: project.title,
      emoji: project.emoji,
      colorId: project.colorId,
      unit: project.unit,
      value,
      mode,
      reward: project.reward,
      cycle,
      reachedGoal: progressPct(prevCount, project.weeklyGoal) < 100 && cycle.pct >= 100,
    };
  }

  // --- subscriptions ---------------------------------------------------------

  subscribe(projectId: string, uid: string, cb: (snap: ProjectSnapshot | null) => void): Unsubscribe {
    let set = this.listeners.get(projectId);
    if (!set) {
      set = new Set();
      this.listeners.set(projectId, set);
    }
    set.add(cb);
    void this.snapshot(projectId).then(cb);
    return () => {
      set?.delete(cb);
    };
  }

  private async snapshot(projectId: string): Promise<ProjectSnapshot | null> {
    const project = (await this.allProjects()).find((p) => p.id === projectId);
    if (!project) return null;
    const members = await this.read<ProjectMember[]>(membersKey(projectId), []);
    const contributions = await this.read<Contribution[]>(contribKey(projectId), []);
    const key = cycleKeyFor();
    const count = contributions
      .filter((c) => c.cycleKey === key)
      .reduce((sum, c) => sum + c.value, 0);
    return {
      project,
      members: members.sort((a, b) => b.contributionTotal - a.contributionTotal),
      feed: summarizeFeed(
        contributions.filter((c) => members.find((m) => m.uid === c.uid)?.shareFeed !== false),
        MAX_FEED,
      ),
      cycle: cycleProgress(key, count, project.weeklyGoal),
    };
  }

  private async notify(projectId: string): Promise<void> {
    const set = this.listeners.get(projectId);
    if (!set || set.size === 0) return;
    const snap = await this.snapshot(projectId);
    set.forEach((cb) => cb(snap));
  }
}

const MAX_FEED = 30;
