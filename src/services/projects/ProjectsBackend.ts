/**
 * Backend abstraction for community projects. The app depends only on this
 * interface; a local AsyncStorage implementation runs today (single-device,
 * fully offline) and a Firestore implementation lights up cross-device realtime
 * the moment Firebase keys are configured — with no caller changes. Mirrors the
 * AuthService / SyncService seam philosophy already used across the app.
 */
import type { BucketColorId } from '@/lib/buckets';
import type {
  Contribution,
  CycleProgress,
  Project,
  ProjectMember,
  ProjectSuggestedHabit,
} from '@/lib/projects';
import type { HeroPresentation, QuestCategory } from '@/types';

/** Who is acting — derived from the signed-in user + their hero identity. */
export interface ProjectIdentity {
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
}

export interface ProjectDraft {
  title: string;
  emoji: string;
  colorId: BucketColorId;
  region: string;
  summary: string;
  unit: string;
  weeklyGoal: number;
  reward: string;
  suggestedHabits: ProjectSuggestedHabit[];
}

export interface ContributionInput {
  habitTitle: string;
  category?: QuestCategory;
  /** Units this completion adds (>= 1). */
  value: number;
}

/** Everything the detail screen needs, recomputed on any change. */
export interface ProjectSnapshot {
  project: Project;
  members: ProjectMember[];
  feed: Contribution[];
  /** Progress for the *current* weekly cycle. */
  cycle: CycleProgress;
}

export type Unsubscribe = () => void;

export interface ProjectsBackend {
  /** True when backed by a real shared backend (cross-device). */
  readonly isShared: boolean;

  /** Curated/featured projects everyone can discover. */
  listFeatured(): Promise<Project[]>;
  /** Projects the given user has joined. */
  listMine(uid: string): Promise<Project[]>;
  /** Resolve an invite code to a project (or null). */
  findByInviteCode(code: string): Promise<Project | null>;

  createProject(identity: ProjectIdentity, draft: ProjectDraft): Promise<Project>;
  /** Join a project; `shareFeed` is the member's opt-in to the activity feed. Returns the project. */
  joinProject(identity: ProjectIdentity, projectId: string, shareFeed: boolean): Promise<Project | null>;
  leaveProject(uid: string, projectId: string): Promise<void>;
  setShareFeed(uid: string, projectId: string, shareFeed: boolean): Promise<void>;

  /** Record a member's contribution; bumps the current cycle counter + member total + feed. */
  contribute(identity: ProjectIdentity, projectId: string, input: ContributionInput): Promise<void>;

  /** Live (or near-live) detail subscription. Calls back with null if the project is gone. */
  subscribe(projectId: string, uid: string, cb: (snap: ProjectSnapshot | null) => void): Unsubscribe;
}
