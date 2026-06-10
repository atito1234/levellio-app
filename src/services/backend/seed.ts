import type { Character, Quest } from '@/types';

/** Default uid for the local anonymous hero. */
export const LOCAL_UID = 'local-hero';

/** A fresh level-1 hero with no streak yet. */
export function seedCharacter(uid: string): Character {
  return {
    id: uid,
    name: 'Hero',
    presentation: 'neutral',
    level: 1,
    xp: 0,
    streakDays: 0,
    tier: 'novice',
    companionStage: 'spark',
  };
}

/** Starter quests so a new player has something to do immediately. */
export function seedQuests(): Quest[] {
  return [
    { id: 'q1', title: 'Drink a glass of water', category: 'health', difficulty: 'easy', baseXp: 20, completed: false },
    { id: 'q2', title: '20-minute workout', category: 'fitness', difficulty: 'medium', baseXp: 40, completed: false },
    { id: 'q3', title: 'Deep-work session on your goal', category: 'productivity', difficulty: 'hard', baseXp: 70, completed: false },
  ];
}
