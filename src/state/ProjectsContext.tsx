import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/state/AuthContext';
import { useGame } from '@/state/GameContext';
import { projectsBackend, type ProjectDraft, type ProjectIdentity, type ProjectSnapshot, type Unsubscribe } from '@/services/projects';
import { ProjectLinkStore } from '@/services/projects/projectLinkStore';
import { AsyncStorageStore } from '@/services/storage';
import {
  EMPTY_PROJECT_LINKS,
  linkHabit as linkHabitPure,
  linkedProjectIds as linkedIdsPure,
  unlinkHabit as unlinkHabitPure,
  unlinkProject as unlinkProjectPure,
  type ProjectLinks,
} from '@/lib/projectLinks';
import type { Project } from '@/lib/projects';
import type { QuestCategory } from '@/types';

const linkStore = new ProjectLinkStore(new AsyncStorageStore());

export interface CompletedHabit {
  activityId: string;
  title: string;
  category?: QuestCategory;
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
  linkHabit: (activityId: string, projectId: string) => Promise<void>;
  unlinkHabit: (activityId: string, projectId: string) => Promise<void>;
  /** Subscribe to a project's live detail (project + members + feed + cycle). */
  subscribe: (projectId: string, cb: (snap: ProjectSnapshot | null) => void) => Unsubscribe;
  /** Emit contributions for a completed habit to every project it's linked to. */
  recordCompletion: (habit: CompletedHabit) => Promise<void>;
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

  const subscribe = useCallback(
    (projectId: string, cb: (snap: ProjectSnapshot | null) => void) =>
      projectsBackend.subscribe(projectId, uid ?? '', cb),
    [uid],
  );

  const recordCompletion = useCallback(
    async (habit: CompletedHabit) => {
      if (!identity) return;
      const projectIds = linkedIdsPure(links, habit.activityId);
      if (projectIds.length === 0) return;
      // Best-effort and non-blocking for the completion flow; the local backend
      // is durable and Firestore queues writes while offline.
      await Promise.all(
        projectIds.map((projectId) =>
          projectsBackend
            .contribute(identity, projectId, { habitTitle: habit.title, category: habit.category, value: 0 })
            .catch(() => undefined),
        ),
      );
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
      linkHabit,
      unlinkHabit,
      subscribe,
      recordCompletion,
    }),
    [ready, uid, featured, myProjects, links, refresh, joinByCode, joinProject, createProject, leaveProject, setShareFeed, linkHabit, unlinkHabit, subscribe, recordCompletion],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error('useProjects must be used within a ProjectsProvider');
  return ctx;
}
