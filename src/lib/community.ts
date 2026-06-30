/**
 * Community social layer — pure types + helpers (no I/O), so the model is fully
 * unit-testable and maps cleanly onto Firestore:
 *   posts/{postId}                      a feed post (manual share or a contribution)
 *   posts/{postId}/comments/{id}        the comment thread
 *   users/{uid}/following/{targetUid}   the network graph
 *
 * Reactions live inline on the post as a { uid: emoji } map — simple to render
 * (counts + the viewer's own reaction derive from it) and cheap at alpha scale.
 */
import type { BucketColorId } from './buckets';
import type { ContributionMode } from './projects';
import { screenText } from './contentSafety';
import type { HeroPresentation, QuestCategory } from '@/types';

/** The one-tap reactions, in display order (clap, fire, strength, heart). */
export const REACTIONS = ['👏', '🔥', '💪', '❤️'] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];

export const MAX_POST_TEXT = 500;
export const MAX_COMMENT_TEXT = 300;

export type PostKind = 'post' | 'contribution' | 'ask';

/**
 * Who can see a post. `friends` maps to the user's network (people they follow,
 * and — once the friends graph ships — confirmed friends). Absent = `public`
 * (back-compat for posts created before audience controls).
 */
export type PostAudience = 'public' | 'friends' | 'private';

/** Attached media on a post. `url` is a hosted (Firebase Storage) download URL. */
export interface PostMedia {
  url: string;
  type: 'image' | 'video';
}

/** A peer's answer can attach a ready-made habit the asker adopts in one tap. */
export interface SuggestedHabit {
  title: string;
  category: QuestCategory;
  contribution: number;
}

/** Who is acting in the community — derived from the account + hero identity. */
export interface CommunityIdentity {
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
}

export interface Post {
  id: string;
  authorUid: string;
  displayName: string;
  presentation?: HeroPresentation;
  text: string;
  kind: PostKind;
  /** Optional project context (a post can be scoped to a project). */
  projectId?: string;
  projectTitle?: string;
  projectColorId?: BucketColorId;
  /** Contribution-post extras. */
  habitTitle?: string;
  value?: number;
  mode?: ContributionMode;
  /** For 'ask' posts: the life-area the asker wants help with. */
  categoryHint?: QuestCategory;
  /** Life-area tag for color-coding the feed (any post kind). */
  category?: QuestCategory;
  /** Who can see this post. Absent = public (back-compat). */
  audience?: PostAudience;
  /** Optional attached photo/video (hosted). Off until Firebase Storage/Blaze. */
  media?: PostMedia;
  createdAt: number;
  /** uid → emoji. The source of truth for counts + the viewer's own reaction. */
  reactions: Record<string, ReactionEmoji>;
  commentCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
  text: string;
  /** When present, an answer that proposes a habit the asker can adopt in one tap. */
  suggestedHabit?: SuggestedHabit;
  createdAt: number;
}

/** What the feed shows: everyone, just your network, or one project. */
export type FeedScope = 'all' | 'network' | { projectId: string };

export interface PostDraft {
  text: string;
  kind?: PostKind;
  projectId?: string;
  projectTitle?: string;
  projectColorId?: BucketColorId;
  habitTitle?: string;
  value?: number;
  mode?: ContributionMode;
  categoryHint?: QuestCategory;
  category?: QuestCategory;
  audience?: PostAudience;
  media?: PostMedia;
}

// --- reaction helpers --------------------------------------------------------

/** Tally a reactions map into per-emoji counts. */
export function reactionCounts(reactions: Record<string, ReactionEmoji>): Partial<Record<ReactionEmoji, number>> {
  const out: Partial<Record<ReactionEmoji, number>> = {};
  for (const emoji of Object.values(reactions)) out[emoji] = (out[emoji] ?? 0) + 1;
  return out;
}

/** Total reactions on a post. */
export function reactionTotal(reactions: Record<string, ReactionEmoji>): number {
  return Object.keys(reactions).length;
}

/** The viewer's current reaction, or null. */
export function myReaction(reactions: Record<string, ReactionEmoji>, uid: string): ReactionEmoji | null {
  return reactions[uid] ?? null;
}

/** The distinct emojis present, most-used first (for the compact summary). */
export function topReactions(reactions: Record<string, ReactionEmoji>, n = 3): ReactionEmoji[] {
  const counts = reactionCounts(reactions);
  return REACTIONS.filter((e) => (counts[e] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0))
    .slice(0, n);
}

/** Toggle a reaction immutably: tapping your current one clears it. */
export function toggleReaction(
  reactions: Record<string, ReactionEmoji>,
  uid: string,
  emoji: ReactionEmoji,
): Record<string, ReactionEmoji> {
  const next = { ...reactions };
  if (next[uid] === emoji) delete next[uid];
  else next[uid] = emoji;
  return next;
}

// --- validation --------------------------------------------------------------

export function isValidPostText(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_POST_TEXT && screenText(t).ok;
}

export function isValidCommentText(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_COMMENT_TEXT && screenText(t).ok;
}

/** Does a post pass the current feed scope for the given viewer + network? */
export function postInScope(post: Post, scope: FeedScope, following: ReadonlySet<string>, uid: string): boolean {
  if (scope === 'all') return true;
  if (scope === 'network') return post.authorUid === uid || following.has(post.authorUid);
  return post.projectId === scope.projectId;
}

/**
 * Audience gate: can this viewer SEE the post at all (independent of feed scope)?
 * public (or legacy/no audience) → everyone; private → author only; friends →
 * author or someone in their network. Applied on top of scope + block filtering.
 */
export function canViewPost(post: Post, viewerUid: string, following: ReadonlySet<string>): boolean {
  switch (post.audience) {
    case 'private':
      return post.authorUid === viewerUid;
    case 'friends':
      return post.authorUid === viewerUid || following.has(post.authorUid);
    default:
      return true; // 'public' or undefined
  }
}

// --- formatting --------------------------------------------------------------

/** Compact "time ago" label (just now / 5m / 3h / 2d / Jan 4). */
export function timeAgo(
  ts: number,
  now: number = Date.now(),
  opts: { justNow?: string; locale?: string } = {},
): string {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  if (s < 60) return opts.justNow ?? 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString(opts.locale, { month: 'short', day: 'numeric' });
}

/** Newest-first, bounded slice for display (ties broken by id for stability). */
export function sortFeed(posts: readonly Post[], limit = 100): Post[] {
  return [...posts]
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .slice(0, Math.max(0, limit));
}
