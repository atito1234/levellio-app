/**
 * Category metadata — the single source of truth for quest categories, their
 * display labels, and icons. Used by quest cards, the creator, and the library.
 */
import type { QuestCategory } from '@/types';

export const CATEGORY_META: Record<QuestCategory, { label: string; icon: string }> = {
  fitness: { label: 'Fitness', icon: '💪' },
  mind: { label: 'Mind', icon: '🧘' },
  learning: { label: 'Learning', icon: '📚' },
  health: { label: 'Health', icon: '🌱' },
  productivity: { label: 'Productivity', icon: '🎯' },
  relationships: { label: 'Relationships', icon: '🤝' },
  creativity: { label: 'Creativity', icon: '🎨' },
  finance: { label: 'Finance', icon: '💰' },
};

/** Stable display/order of categories. */
export const CATEGORY_ORDER: readonly QuestCategory[] = [
  'fitness',
  'mind',
  'learning',
  'health',
  'productivity',
  'relationships',
  'creativity',
  'finance',
];

/**
 * A distinct, palette-safe colour per category — drives the schedule calendar's
 * colour-coding so a glance reads the *kind* of day. Gold (#FFB23E) is reserved
 * for 100%/reward and intentionally not used here.
 */
export const CATEGORY_COLOR: Record<QuestCategory, string> = {
  fitness: '#6C4CF1', // violet
  mind: '#16C8A8', // teal
  learning: '#2E8BD6', // sky
  health: '#5C9A1B', // lime
  productivity: '#D9457E', // rose
  relationships: '#E2682E', // orange
  creativity: '#C44FB0', // magenta
  finance: '#5A5A72', // slate
};

/** Maps pre-Day-7 categories to the current set for migration. */
export const LEGACY_CATEGORY_MAP: Record<string, QuestCategory> = {
  habit: 'health',
  workout: 'fitness',
  goal: 'productivity',
};

/** Resolve any stored/legacy category string to a valid QuestCategory. */
export function resolveCategory(value: unknown, fallback: QuestCategory = 'health'): QuestCategory {
  if (typeof value !== 'string') return fallback;
  if ((CATEGORY_ORDER as readonly string[]).includes(value)) return value as QuestCategory;
  return LEGACY_CATEGORY_MAP[value] ?? fallback;
}
