/**
 * Moderation model — pure types/helpers shared by the reporting flow, the backend,
 * and the owner console. A report points at a piece of content (or a user) and
 * carries the reporter + a reason. Reports are write-by-anyone, read-by-admins
 * (enforced in firestore.rules). No I/O here.
 */

/** What a report targets. 'user' = the person; the rest = a piece of content. */
export type ReportTargetType = 'post' | 'comment' | 'message' | 'story' | 'profile' | 'user';

export type ReportReason = 'harassment' | 'hate' | 'sexual' | 'spam' | 'selfHarm' | 'other';

export const REPORT_REASONS: readonly ReportReason[] = [
  'harassment',
  'hate',
  'sexual',
  'spam',
  'selfHarm',
  'other',
];

/** A target the UI hands to `requestReport` — enough to file and to locate it. */
export interface ReportTarget {
  type: ReportTargetType;
  /** Content id (postId/commentId/…) or, for 'user'/'profile', the uid. */
  id: string;
  /** The uid that owns the target (the person who'd be actioned). */
  targetUid: string;
  /** Optional short text snapshot shown in the console. */
  preview?: string;
  /** For nested content, the parent ids needed to delete it. */
  postId?: string;
  threadId?: string;
}

export interface Report extends ReportTarget {
  /** The report document's own id (distinct from the target content `id`). */
  reportId: string;
  reporterUid: string;
  reason: ReportReason;
  createdAt: number;
  status: 'open' | 'resolved';
}

/** Payload written when filing (reportId/status/createdAt are set by the backend). */
export type NewReport = Omit<Report, 'reportId' | 'status' | 'createdAt'>;

// --- Project applications (delegated, manager-approved project creation) ------

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

/** A request to create a project. Approved applicants become the project's owner
 *  and agree to moderate it. `visibility` maps to the project `featured` flag
 *  (public = world-listed; private = invite-only). */
export interface ProjectApplication {
  id: string;
  applicantUid: string;
  applicantName: string;
  title: string;
  summary: string;
  region: string;
  visibility: 'public' | 'private';
  why: string;
  agreedToModerate: boolean;
  status: ApplicationStatus;
  createdAt: number;
}

export type NewProjectApplication = Omit<ProjectApplication, 'id' | 'status' | 'createdAt'>;

export function newReport(target: ReportTarget, reporterUid: string, reason: ReportReason): NewReport {
  return {
    type: target.type,
    id: target.id,
    targetUid: target.targetUid,
    reason,
    reporterUid,
    ...(target.preview ? { preview: target.preview.slice(0, 280) } : {}),
    ...(target.postId ? { postId: target.postId } : {}),
    ...(target.threadId ? { threadId: target.threadId } : {}),
  };
}
