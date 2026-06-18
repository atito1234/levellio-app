import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { useGoals } from '@/state/GoalContext';
import { projectsBackend, type ContributionResult, type ProjectDraft, type ProjectIdentity, type ProjectSnapshot, type Unsubscribe } from '@/services/projects';
import { ProjectLinkStore } from '@/services/projects/projectLinkStore';
import { AsyncStorageStore } from '@/services/storage';
import {
  EMPTY_PROJECT_LINKS,
  habitsForProject as habitsForProjectPure,
  linkHabit as linkHabitPure,
  linkedProjectIds as linkedIdsPure,
  unlinkHabit as unlinkHabitPure,
  unlinkProject as unlinkProjectPure,
  type ProjectLinks,
} from '@/lib/projectLinks';
import type { ContributionMode, CycleProgress, Project } from '@/lib/projects';
import { dayKey } from '@/lib/dates';
import type { QuestCategory } from '@/types';

const linkStore = new ProjectLinkStore(new AsyncStorageStore());

export interface CompletedHabit {
  activityId: string;
  title: string;
  category?: QuestCategory;
  /** Where it was done — defaults to 'remote' when omitted. */
  mode?: ContributionMode;
}

interface ProjectsContextValue {
  ready: boolean;
  /** True when collaboration is cross-device (Firebase). */
  isShared: boolean;
  /** Whether a member is signed in (gates the feature). */
  signedIn: boolean;
  featured: Project[];
  myProjects: Project[];
  links: ProjectLinks;
  refresh: () => Promise<void>;
  joinByCode: (code: string, shareFeed: boolean) => Promise<Project | null>;
  joinProject: (projectId: string, shareFeed: boolean) => Promise<Project | null>;
  createProject: (draft: ProjectDraft) => Promise<Project | null>;
  leaveProject: (projectId: string) => Promise<void>;
  setShareFeed: (projectId: string, shareFeed: boolean) => Promise<void>;
  linkedProjectIds: (activityId: string) => string[];
  /** All activity ids that belong to ≥1 project (exclusion set for personal goals). */
  projectActivityIds: Set<string>;
  /** Resolve a habit's linked projects to full Project objects (for badges). */
  projectsForHabit: (activityId: string) => Project[];
  linkHabit: (activityId: string, projectId: string) => Promise<void>;
  unlinkHabit: (activityId: string, projectId: string) => Promise<void>;
  /** Subscribe to a project's live detail (project + members + feed + cycle). */
  subscribe: (projectId: string, cb: (snap: ProjectSnapshot | null) => void) => Unsubscribe;
  /**
   * Emit contributions for a completed habit to every project it's linked to.
   * Returns what each contribution achieved (for celebration).
   */
  recordCompletion: (habit: CompletedHabit) => Promise<ContributionResult[]>;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

/** Owns the member's community projects (the shared, networked layer). */
export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { account } = useAuth();
  const { character } = useGame();
  const uid = account?.uid ?? null;

  const [featured, setFeatured] = useState<Project[]>([]);
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [links, setLinks] = useState<ProjectLinks>(EMPTY_PROJECT_LINKS);
  const [ready, setReady] = useState(false);

  const identity = useMemo<ProjectIdentity | null>(() => {
    if (!uid) return null;
    return {
      uid,
      displayName: account?.displayName?.trim() || character?.name?.trim() || 'Hero',
      presentation: character?.presentation,
    };
  }, [uid, account?.displayName, character?.name, character?.presentation]);

  const refresh = useCallback(async () => {
    const [feat, mine] = await Promise.all([
      projectsBackend.listFeatured(),
      uid ? projectsBackend.listMine(uid) : Promise.resolve([]),
    ]);
    setFeatured(feat);
    setMyProjects(mine);
  }, [uid]);

  useEffect(() => {
    let active = true;
    (async () => {
      setReady(false);
      const loadedLinks = uid ? await linkStore.load(uid) : EMPTY_PROJECT_LINKS;
      await refresh();
      if (active) {
        setLinks(loadedLinks);
        setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid, refresh]);

  const persistLinks = useCallback(
    async (next: ProjectLinks) => {
      setLinks(next);
      if (uid) await linkStore.save(uid, next);
    },
    [uid],
  );

  const joinProject = useCallback(
    async (projectId: string, shareFeed: boolean) => {
      if (!identity) return null;
      const project = await projectsBackend.joinProject(identity, projectId, shareFeed);
      await refresh();
      return project;
    },
    [identity, refresh],
  );

  const joinByCode = useCallback(
    async (code: string, shareFeed: boolean) => {
      if (!identity) return null;
      const project = await projectsBackend.findByInviteCode(code);
      if (!project) return null;
      return joinProject(project.id, shareFeed);
    },
    [identity, joinProject],
  );

  const createProject = useCallback(
    async (draft: ProjectDraft) => {
      if (!identity) return null;
      const project = await projectsBackend.createProject(identity, draft);
      await refresh();
      return project;
    },
    [identity, refresh],
  );

  const leaveProject = useCallback(
    async (projectId: string) => {
      if (!uid) return;
      await projectsBackend.leaveProject(uid, projectId);
      await persistLinks(unlinkProjectPure(links, projectId));
      await refresh();
    },
    [uid, links, persistLinks, refresh],
  );

  const setShareFeed = useCallback(
    async (projectId: string, shareFeed: boolean) => {
      if (!uid) return;
      await projectsBackend.setShareFeed(uid, projectId, shareFeed);
    },
    [uid],
  );

  const linkHabit = useCallback(
    (activityId: string, projectId: string) => persistLinks(linkHabitPure(links, activityId, projectId)),
    [links, persistLinks],
  );

  const unlinkHabit = useCallback(
    (activityId: string, projectId: string) => persistLinks(unlinkHabitPure(links, activityId, projectId)),
    [links, persistLinks],
  );

  const projectActivityIds = useMemo(
    () => new Set(Object.keys(links).filter((id) => (links[id]?.length ?? 0) > 0)),
    [links],
  );

  // Keep each project's dedicated goal in sync: wherever an activity gets linked
  // to a project (home, Feed, project detail…), ensure the project's goal exists
  // and file the activity under it — so it shows in the goal's focus + calendar,
  // never bleeding into personal goals.
  const { goals, addGoal, goalsForHabit, linkGoal } = useGoals();
  const creatingGoalRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      for (const project of myProjects) {
        const activityIds = habitsForProjectPure(links, project.id);
        if (activityIds.length === 0) continue;
        let gid = goals.find((g) => g.kind === 'project' && g.projectId === project.id)?.id ?? null;
        if (!gid) {
          if (creatingGoalRef.current.has(project.id)) continue;
          creatingGoalRef.current.add(project.id);
          const cats = [...new Set(project.suggestedHabits.map((h) => h.category))];
          const created = await addGoal({
            title: project.title,
            emoji: project.emoji,
            colorId: project.colorId,
            categories: cats.length ? cats : ['health'],
            kind: 'project',
            projectId: project.id,
          });
          creatingGoalRef.current.delete(project.id);
          gid = created?.id ?? null;
        }
        if (!gid || cancelled) continue;
        for (const aid of activityIds) {
          if (!goalsForHabit(aid).includes(gid)) await linkGoal(aid, gid);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // addGoal/linkGoal/goalsForHabit are context fns (unstable identities) — run on data deps only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, myProjects, links, goals]);

  const projectsForHabit = useCallback(
    (activityId: string): Project[] => {
      const ids = linkedIdsPure(links, activityId);
      if (ids.length === 0) return [];
      const byId = new Map<string, Project>();
      for (const p of [...myProjects, ...featured]) byId.set(p.id, p);
      return ids.map((id) => byId.get(id)).filter((p): p is Project => p !== undefined);
    },
    [links, myProjects, featured],
  );

  const subscribe = useCallback(
    (projectId: string, cb: (snap: ProjectSnapshot | null) => void) =>
      projectsBackend.subscribe(projectId, uid ?? '', cb),
    [uid],
  );

  const recordCompletion = useCallback(
    async (habit: CompletedHabit): Promise<ContributionResult[]> => {
      if (!identity) return [];
      const projectIds = linkedIdsPure(links, habit.activityId);
      if (projectIds.length === 0) return [];
      // Best-effort and non-blocking for the completion flow; the local backend
      // is durable and Firestore queues writes while offline.
      const results = await Promise.all(
        projectIds.map((projectId) =>
          projectsBackend
            .contribute(identity, projectId, { habitTitle: habit.title, category: habit.category, value: 0, mode: habit.mode })
            .catch(() => null),
        ),
      );
      return results.filter((r): r is ContributionResult => r !== null);
    },
    [identity, links],
  );

  const value = useMemo<ProjectsContextValue>(
    () => ({
      ready,
      isShared: projectsBackend.isShared,
      signedIn: Boolean(uid),
      featured,
      myProjects,
      links,
      refresh,
      joinByCode,
      joinProject,
      createProject,
      leaveProject,
      setShareFeed,
      linkedProjectIds: (activityId: string) => linkedIdsPure(links, activityId),
      projectActivityIds,
      projectsForHabit,
      linkHabit,
      unlinkHabit,
      subscribe,
      recordCompletion,
    }),
    [ready, uid, featured, myProjects, links, projectActivityIds, refresh, joinByCode, joinProject, createProject, leaveProject, setShareFeed, projectsForHabit, linkHabit, unlinkHabit, subscribe, recordCompletion],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within a ProjectsProvider');
  return ctx;
}

/** Live, glanceable summary of one project — for the home strips. */
export interface ProjectSummary {
  cycle: CycleProgress;
  /** Distinct members who contributed today (the "who's here" pulse). */
  activeToday: number;
  memberCount: number;
}

/**
 * Subscribe to a single project's live cycle + today's activity for compact
 * cards (Community / World strips). Returns null until the first snapshot.
 */
export function useProjectSummary(projectId: string): ProjectSummary | null {
  const { subscribe } = useProjects();
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  useEffect(() => {
    const unsub = subscribe(projectId, (snap) => {
      if (!snap) {
        setSummary(null);
        return;
      }
      const today = dayKey(new Date());
      const activeToday = new Set(
        snap.feed.filter((c) => dayKey(new Date(c.createdAt)) === today).map((c) => c.uid),
      ).size;
      setSummary({
        cycle: snap.cycle,
        activeToday,
        memberCount: snap.members.length || snap.project.memberCount,
      });
    });
    return unsub;
  }, [projectId, subscribe]);
  return summary;
}
