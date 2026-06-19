/**
 * Firestore implementation of ProjectsBackend — the real, cross-device,
 * realtime backend. Only constructed when Firebase is configured (see ./index).
 *
 * Layout:
 *   projects/{projectId}
 *   projects/{projectId}/members/{uid}
 *   projects/{projectId}/cycles/{cycleKey}      counter: { count, goal }
 *   projects/{projectId}/contributions/{auto}   the activity feed
 *
 * Progress is aggregated with client write-batches that increment the current
 * cycle counter + the member's total on each contribution (no Cloud Functions).
 */
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';
import { getDb } from '@/services/firebase/app';
import {
  contributionValue,
  cycleKeyFor,
  cycleProgress,
  genInviteCode,
  normalizeInviteCode,
  progressPct,
  summarizeFeed,
  MAX_FEED_ITEMS,
  type Contribution,
  type ContributionMode,
  type Project,
  type ProjectMember,
} from '@/lib/projects';
import type {
  ContributionInput,
  ContributionResult,
  ProjectDraft,
  ProjectIdentity,
  ProjectSnapshot,
  ProjectsBackend,
  Unsubscribe,
} from './ProjectsBackend';

function toProject(id: string, d: DocumentData): Project {
  return {
    id,
    title: d.title ?? '',
    emoji: d.emoji ?? '🎯',
    colorId: d.colorId ?? 'violet',
    region: d.region ?? '',
    summary: d.summary ?? '',
    unit: d.unit ?? 'done',
    weeklyGoal: typeof d.weeklyGoal === 'number' ? d.weeklyGoal : 1,
    featured: Boolean(d.featured),
    ownerUid: d.ownerUid ?? '',
    inviteCode: d.inviteCode ?? '',
    suggestedHabits: Array.isArray(d.suggestedHabits) ? d.suggestedHabits : [],
    reward: d.reward ?? '',
    memberCount: typeof d.memberCount === 'number' ? d.memberCount : 0,
    createdAt: typeof d.createdAt === 'number' ? d.createdAt : 0,
    ...(typeof d.lat === 'number' ? { lat: d.lat } : {}),
    ...(typeof d.lng === 'number' ? { lng: d.lng } : {}),
    ...(typeof d.radiusKm === 'number' ? { radiusKm: d.radiusKm } : {}),
  };
}

export class FirebaseProjectsBackend implements ProjectsBackend {
  readonly isShared = true;
  private get db(): Firestore {
    return getDb();
  }

  async listFeatured(): Promise<Project[]> {
    const snap = await getDocs(query(collection(this.db, 'projects'), where('featured', '==', true)));
    return snap.docs.map((d) => toProject(d.id, d.data()));
  }

  async listMine(uid: string): Promise<Project[]> {
    const memberships = await getDocs(query(collectionGroup(this.db, 'members'), where('uid', '==', uid)));
    const projects = await Promise.all(
      memberships.docs.map(async (m) => {
        const projectRef = m.ref.parent.parent;
        if (!projectRef) return null;
        const p = await getDoc(projectRef);
        return p.exists() ? toProject(p.id, p.data()) : null;
      }),
    );
    return projects.filter((p): p is Project => p !== null);
  }

  async findByInviteCode(code: string): Promise<Project | null> {
    const norm = normalizeInviteCode(code);
    if (!norm) return null;
    const snap = await getDocs(query(collection(this.db, 'projects'), where('inviteCode', '==', norm), limit(1)));
    const first = snap.docs[0];
    return first ? toProject(first.id, first.data()) : null;
  }

  async createProject(identity: ProjectIdentity, draft: ProjectDraft): Promise<Project> {
    const ref = doc(collection(this.db, 'projects'));
    const project: Project = {
      id: ref.id,
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
    await setDoc(ref, project);
    await this.joinAs(identity, ref.id, true, 'owner');
    return project;
  }

  joinProject(identity: ProjectIdentity, projectId: string, shareFeed: boolean): Promise<Project | null> {
    return this.joinAs(identity, projectId, shareFeed, 'member');
  }

  private async joinAs(
    identity: ProjectIdentity,
    projectId: string,
    shareFeed: boolean,
    role: 'owner' | 'member',
  ): Promise<Project | null> {
    const projectRef = doc(this.db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) return null;

    const memberRef = doc(this.db, 'projects', projectId, 'members', identity.uid);
    if ((await getDoc(memberRef)).exists()) return toProject(projectSnap.id, projectSnap.data());

    const member: ProjectMember = {
      uid: identity.uid,
      displayName: identity.displayName,
      presentation: identity.presentation,
      role,
      joinedAt: Date.now(),
      shareFeed,
      contributionTotal: 0,
    };
    const batch = writeBatch(this.db);
    batch.set(memberRef, member);
    batch.update(projectRef, { memberCount: increment(1) });
    await batch.commit();
    return toProject(projectSnap.id, projectSnap.data());
  }

  async leaveProject(uid: string, projectId: string): Promise<void> {
    const batch = writeBatch(this.db);
    batch.delete(doc(this.db, 'projects', projectId, 'members', uid));
    batch.update(doc(this.db, 'projects', projectId), { memberCount: increment(-1) });
    await batch.commit();
  }

  async setShareFeed(uid: string, projectId: string, shareFeed: boolean): Promise<void> {
    await updateDoc(doc(this.db, 'projects', projectId, 'members', uid), { shareFeed });
  }

  async contribute(
    identity: ProjectIdentity,
    projectId: string,
    input: ContributionInput,
  ): Promise<ContributionResult | null> {
    const projectRef = doc(this.db, 'projects', projectId);
    const memberRef = doc(this.db, 'projects', projectId, 'members', identity.uid);
    const cycleKey = cycleKeyFor();
    const cycleRef = doc(this.db, 'projects', projectId, 'cycles', cycleKey);
    const [projectSnap, memberSnap, cycleSnap] = await Promise.all([
      getDoc(projectRef),
      getDoc(memberRef),
      getDoc(cycleRef),
    ]);
    if (!projectSnap.exists()) return null;
    const project = toProject(projectSnap.id, projectSnap.data());
    const value = Math.max(1, Math.round(input.value || contributionValue(input.habitTitle, project)));
    const mode: ContributionMode = input.mode ?? 'remote';
    const shareFeed = memberSnap.exists() ? memberSnap.data().shareFeed !== false : true;
    // Cycle total before this write — to detect the goal-crossing moment. May be
    // mildly stale across devices, which is acceptable for a celebration cue.
    const prevCount = cycleSnap.exists() && typeof cycleSnap.data().count === 'number' ? cycleSnap.data().count : 0;

    const batch = writeBatch(this.db);
    // Counter doc per cycle (created on first contribution).
    batch.set(cycleRef, { cycleKey, goal: project.weeklyGoal, count: increment(value) }, { merge: true });
    batch.set(memberRef, { contributionTotal: increment(value) }, { merge: true });
    // Only opted-in members appear in the shared feed; the count always counts.
    if (shareFeed) {
      batch.set(doc(collection(this.db, 'projects', projectId, 'contributions')), {
        uid: identity.uid,
        displayName: identity.displayName,
        habitTitle: input.habitTitle,
        category: input.category ?? null,
        value,
        mode,
        cycleKey,
        createdAt: Date.now(),
        serverAt: serverTimestamp(),
      });
    }
    await batch.commit();

    const cycle = cycleProgress(cycleKey, prevCount + value, project.weeklyGoal);
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

  async deleteMyData(uid: string): Promise<void> {
    // Leave every project (delete membership + decrement count).
    const memberships = await getDocs(query(collectionGroup(this.db, 'members'), where('uid', '==', uid)));
    for (const m of memberships.docs) {
      const projectRef = m.ref.parent.parent;
      const batch = writeBatch(this.db);
      batch.delete(m.ref);
      if (projectRef) batch.update(projectRef, { memberCount: increment(-1) });
      await batch.commit();
    }
    // Delete the user's own contributions across all projects.
    const contributions = await getDocs(query(collectionGroup(this.db, 'contributions'), where('uid', '==', uid)));
    for (const c of contributions.docs) {
      await deleteDoc(c.ref);
    }
  }

  subscribe(projectId: string, _uid: string, cb: (snap: ProjectSnapshot | null) => void): Unsubscribe {
    const cycleKey = cycleKeyFor();
    let project: Project | null = null;
    let members: ProjectMember[] = [];
    let feed: Contribution[] = [];
    let count = 0;

    const emit = () => {
      if (!project) {
        cb(null);
        return;
      }
      cb({
        project: { ...project, memberCount: members.length || project.memberCount },
        members: [...members].sort((a, b) => b.contributionTotal - a.contributionTotal),
        feed: summarizeFeed(feed),
        cycle: cycleProgress(cycleKey, count, project.weeklyGoal),
      });
    };

    const unsubProject = onSnapshot(doc(this.db, 'projects', projectId), (d) => {
      project = d.exists() ? toProject(d.id, d.data()) : null;
      emit();
    });
    const unsubMembers = onSnapshot(collection(this.db, 'projects', projectId, 'members'), (s) => {
      members = s.docs.map((m) => m.data() as ProjectMember);
      emit();
    });
    const unsubFeed = onSnapshot(
      query(
        collection(this.db, 'projects', projectId, 'contributions'),
        orderBy('createdAt', 'desc'),
        limit(MAX_FEED_ITEMS),
      ),
      (s) => {
        feed = s.docs.map((c) => ({ id: c.id, ...(c.data() as Omit<Contribution, 'id'>) }));
        emit();
      },
    );
    const unsubCycle = onSnapshot(doc(this.db, 'projects', projectId, 'cycles', cycleKey), (d) => {
      count = d.exists() && typeof d.data().count === 'number' ? d.data().count : 0;
      emit();
    });

    return () => {
      unsubProject();
      unsubMembers();
      unsubFeed();
      unsubCycle();
    };
  }
}
