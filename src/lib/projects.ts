/**
 * Community Projects ("Gos") — invite-only, collaborative habit projects where
 * members build habits that add up to a shared, real-world goal (e.g. "38
 * standing-water sites cleaned this week"). Pure data + pure helpers only (no
 * I/O), so the model is fully unit-testable and maps cleanly onto Firestore:
 *   projects/{projectId}
 *   projects/{projectId}/members/{uid}
 *   projects/{projectId}/cycles/{cycleKey}        (a counter doc)
 *   projects/{projectId}/contributions/{id}       (the activity feed)
 *
 * Progress is honest: it is the sum of real completions members logged against
 * the project, counted within the current weekly cycle.
 */
import { dayKey } from './dates';
import { getBucketColor, type BucketColor, type BucketColorId } from './buckets';
import type { HeroPresentation, QuestCategory } from '@/types';

/** Colours a project may use — the shared palette minus gold (kept for 100%/reward). */
export const PROJECT_COLOR_IDS: readonly BucketColorId[] = ['violet', 'teal', 'rose', 'sky', 'lime', 'slate'];

export const MAX_PROJECT_TITLE = 60;
export const MAX_PROJECT_SUMMARY = 240;
export const MAX_PROJECT_UNIT = 40;
export const MAX_FEED_ITEMS = 50;
export const INVITE_CODE_LENGTH = 6;
/** Unambiguous alphabet for invite codes (no 0/O, 1/I/L). */
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** A habit a project suggests members adopt, with how much one completion contributes. */
export interface ProjectSuggestedHabit {
  title: string;
  category: QuestCategory;
  /** Units contributed per completion (>= 1). */
  contribution: number;
}

export interface Project {
  id: string;
  title: string;
  emoji: string;
  colorId: BucketColorId;
  /** Where it's happening, e.g. "Fort-Liberté, Haiti". */
  region: string;
  summary: string;
  /** What's being counted, e.g. "sites cleaned", "trees planted". */
  unit: string;
  /** Target units per (weekly) cycle. */
  weeklyGoal: number;
  /** Curated/featured projects are discoverable by everyone; others are invite-only. */
  featured: boolean;
  ownerUid: string;
  /** Short human-shareable join code. */
  inviteCode: string;
  suggestedHabits: ProjectSuggestedHabit[];
  /** The real-world reward unlocked when the cycle goal is met. */
  reward: string;
  /** Denormalized member count for catalog cards. */
  memberCount: number;
  createdAt: number;
}

export interface ProjectMember {
  uid: string;
  displayName: string;
  presentation?: HeroPresentation;
  role: 'owner' | 'member';
  joinedAt: number;
  /**
   * Opt-in: when true, this member's completions appear in the shared activity
   * feed with detail (habit name + time). Their contributions ALWAYS count
   * toward progress either way; this only controls feed visibility.
   */
  shareFeed: boolean;
  contributionTotal: number;
}

export interface Contribution {
  id: string;
  uid: string;
  displayName: string;
  habitTitle: string;
  category?: QuestCategory;
  /** Units this completion added (>= 1). */
  value: number;
  cycleKey: string;
  createdAt: number;
}

export interface CycleProgress {
  cycleKey: string;
  count: number;
  goal: number;
  /** 0..100. */
  pct: number;
}

/** Resolve a project's accent/soft colours from its colorId (palette-safe). */
export function projectColor(project: Pick<Project, 'colorId'>): BucketColor {
  return getBucketColor(project.colorId);
}

// --- Weekly cycle (Sunday-anchored) ------------------------------------------

/** Local date at midnight for the Sunday that starts `d`'s week. */
function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay()); // getDay(): 0=Sun
  return x;
}

/** Stable key for the weekly cycle containing `date` (the week's Sunday). */
export function cycleKeyFor(date: Date = new Date()): string {
  return `wk-${dayKey(startOfWeek(date))}`;
}

/** Whole days remaining in the current cycle, inclusive of today (1..7). */
export function daysLeftInCycle(date: Date = new Date()): number {
  return 7 - date.getDay();
}

/** A short "X days left" / "resets tomorrow" style label for the current cycle. */
export function cycleEndLabel(date: Date = new Date()): string {
  const left = daysLeftInCycle(date);
  if (left <= 1) return 'resets tomorrow';
  return `${left} days left`;
}

/** Clamped 0..100 percentage of a count toward a goal (0 goal → 0%). */
export function progressPct(count: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((count / goal) * 100)));
}

/** Build a CycleProgress view-model from a raw count + the project goal. */
export function cycleProgress(cycleKey: string, count: number, goal: number): CycleProgress {
  const safe = Math.max(0, Math.round(count));
  return { cycleKey, count: safe, goal, pct: progressPct(safe, goal) };
}

// --- Invite codes ------------------------------------------------------------

/** Generate a random, unambiguous invite code (e.g. "K7M2QP"). */
export function genInviteCode(rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    out += INVITE_ALPHABET[Math.floor(rand() * INVITE_ALPHABET.length)];
  }
  return out;
}

/** Normalize user-typed/pasted codes: uppercase, strip non-alphabet chars. */
export function normalizeInviteCode(raw: string): string {
  return raw
    .toUpperCase()
    .split('')
    .filter((c) => INVITE_ALPHABET.includes(c))
    .join('')
    .slice(0, INVITE_CODE_LENGTH);
}

export function isValidInviteCode(raw: string): boolean {
  return normalizeInviteCode(raw).length === INVITE_CODE_LENGTH;
}

// --- Contribution math -------------------------------------------------------

/** Loose, case-insensitive title match used to map a completed habit to a suggested one. */
function titlesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * How many units completing `habitTitle` contributes to `project`. If the title
 * matches one of the project's suggested habits, use its declared contribution;
 * otherwise a plain completion counts as 1.
 */
export function contributionValue(habitTitle: string, project: Pick<Project, 'suggestedHabits'>): number {
  const match = project.suggestedHabits.find((h) => titlesMatch(h.title, habitTitle));
  return Math.max(1, Math.round(match?.contribution ?? 1));
}

/** Most-recent-first feed slice, bounded for display. */
export function summarizeFeed(contributions: readonly Contribution[], limit = 20): Contribution[] {
  return [...contributions].sort((a, b) => b.createdAt - a.createdAt).slice(0, Math.max(0, limit));
}

// --- Validation --------------------------------------------------------------

export interface ProjectValidation {
  valid: boolean;
  error?: string;
}

export function validateProjectDraft(input: {
  title: string;
  unit: string;
  weeklyGoal: number;
}): ProjectValidation {
  const title = input.title.trim();
  if (title.length === 0) return { valid: false, error: 'Give your project a name.' };
  if (title.length > MAX_PROJECT_TITLE) return { valid: false, error: `Keep the name under ${MAX_PROJECT_TITLE} characters.` };
  if (input.unit.trim().length === 0) return { valid: false, error: 'What are you counting? (e.g. "trees planted")' };
  if (!Number.isFinite(input.weeklyGoal) || input.weeklyGoal < 1) return { valid: false, error: 'Set a weekly goal of at least 1.' };
  return { valid: true };
}
