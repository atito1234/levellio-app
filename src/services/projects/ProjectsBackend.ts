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
  ContributionMode,
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
  /** Optional geofence pin so on-site completions can be detected. */
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export interface ContributionInput {
  habitTitle: string;
  category?: QuestCategory;
  /** Units this completion adds (>= 1). */
  value: number;
  /** Where it was done — defaults to 'remote' when omitted. */
  mode?: ContributionMode;
}

/**
 * What a single contribution achieved — enough to celebrate it richly without a
 * round-trip: the units added, the project's identity/colour, the new cycle
 * progress, and whether this completion is the one that crossed the weekly goal.
 */
export interface ContributionResult {
  projectId: string;
  title: string;
  emoji: string;
  colorId: BucketColorId;
  unit: string;
  /** Units this completion actually added (>= 1). */
  value: number;
  /** Where it was done — 'onsite' or 'remote'. */
  mode: ContributionMode;
  /** The real-world reward unlocked at 100% (for the team-win moment). */
  reward: string;
  /** Cycle progress *after* this contribution. */
  cycle: CycleProgress;
  /** True only on the completion that takes the cycle from <100% to >=100%. */
  reachedGoal: boolean;
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

  /**
   * Record a member's contribution; bumps the current cycle counter + member
   * total + feed. Returns what was achieved (for celebration), or null if the
   * project no longer exists.
   */
  contribute(
    identity: ProjectIdentity,
    projectId: string,
    input: ContributionInput,
  ): Promise<ContributionResult | null>;

  /** Live (or near-live) detail subscription. Calls back with null if the project is gone. */
  subscribe(projectId: string, uid: string, cb: (snap: ProjectSnapshot | null) => void): Unsubscribe;
}
