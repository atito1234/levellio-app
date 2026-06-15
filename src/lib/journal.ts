/**
 * Battle journal — reflections on the inner dragon ("what's stopping me from
 * this habit?"). Structured like a social post (text + media + emotional
 * reaction + audience + a thread of follow-up notes) so it becomes truly social
 * once the backend/community phase lands. For now it's on-device and private to
 * the user; the `audience` choice is captured forward-looking. Pure data + meta.
 */
export type JournalAudience = 'private' | 'circle' | 'public';
export type JournalMood = 'stuck' | 'anxious' | 'drained' | 'resisting' | 'hopeful' | 'determined';
export type JournalMediaType = 'image' | 'video';

export interface JournalMedia {
  uri: string;
  type: JournalMediaType;
}

export interface JournalFollowUp {
  id: string;
  createdAt: number;
  text: string;
}

export interface JournalEntry {
  id: string;
  createdAt: number;
  /** The dragon this reflection is about (optional). */
  dragonId?: string;
  dragonName?: string;
  /** Habits the reflection relates to (optional). */
  questIds?: string[];
  text: string;
  mood?: JournalMood;
  audience: JournalAudience;
  media?: JournalMedia;
  /** The user's own follow-up notes (their reflection thread). */
  followUps: JournalFollowUp[];
}

export const MOODS: readonly { id: JournalMood; emoji: string; label: string }[] = [
  { id: 'stuck', emoji: '🪨', label: 'Stuck' },
  { id: 'anxious', emoji: '😰', label: 'Anxious' },
  { id: 'drained', emoji: '😮‍💨', label: 'Drained' },
  { id: 'resisting', emoji: '😤', label: 'Resisting' },
  { id: 'hopeful', emoji: '🌱', label: 'Hopeful' },
  { id: 'determined', emoji: '🔥', label: 'Determined' },
];

export const AUDIENCES: readonly { id: JournalAudience; icon: string; label: string; note: string }[] = [
  { id: 'private', icon: '🔒', label: 'Only me', note: 'Stays on your device.' },
  { id: 'circle', icon: '🤝', label: 'Trusted circle', note: 'Shared with your circle when sharing arrives.' },
  { id: 'public', icon: '🌍', label: 'Public', note: 'Shared publicly when sharing arrives.' },
];

export function moodMeta(id?: JournalMood): { emoji: string; label: string } | null {
  return id ? MOODS.find((m) => m.id === id) ?? null : null;
}

export function audienceMeta(id: JournalAudience): { icon: string; label: string; note: string } {
  return AUDIENCES.find((a) => a.id === id) ?? AUDIENCES[0]!;
}
