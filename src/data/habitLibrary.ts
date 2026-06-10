/**
 * Curated starter habit library (NO AI). A broad, organized set of common
 * habits/goals so a brand-new user has plenty to pick from on day one. Each
 * entry can be added to active quests in one tap.
 */
import { QUEST_XP } from '@/lib/leveling';
import { CATEGORY_ORDER } from '@/lib/categories';
import type { Quest, QuestCategory, QuestDifficulty } from '@/types';

export interface LibraryHabit {
  id: string;
  title: string;
  description?: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
}

export const HABIT_LIBRARY: readonly LibraryHabit[] = [
  // Fitness
  { id: 'fit-walk', title: 'Take a 15-minute walk', category: 'fitness', difficulty: 'easy' },
  { id: 'fit-stretch', title: 'Stretch for 5 minutes', category: 'fitness', difficulty: 'easy' },
  { id: 'fit-workout', title: '20-minute workout', category: 'fitness', difficulty: 'medium' },
  { id: 'fit-steps', title: 'Hit 8,000 steps', category: 'fitness', difficulty: 'medium' },
  { id: 'fit-run', title: 'Go for a 5km run', category: 'fitness', difficulty: 'hard' },

  // Mind
  { id: 'mind-meditate', title: 'Meditate for 10 minutes', category: 'mind', difficulty: 'easy' },
  { id: 'mind-breathe', title: 'Do a 2-minute breathing exercise', category: 'mind', difficulty: 'easy' },
  { id: 'mind-journal', title: 'Write a journal entry', category: 'mind', difficulty: 'medium' },
  { id: 'mind-gratitude', title: 'List 3 things you are grateful for', category: 'mind', difficulty: 'easy' },
  { id: 'mind-screens', title: 'One hour with no screens', category: 'mind', difficulty: 'hard' },

  // Learning
  { id: 'learn-read', title: 'Read 10 pages', category: 'learning', difficulty: 'easy' },
  { id: 'learn-language', title: 'Practice a language for 15 minutes', category: 'learning', difficulty: 'medium' },
  { id: 'learn-course', title: 'Complete a lesson in an online course', category: 'learning', difficulty: 'medium' },
  { id: 'learn-skill', title: 'Practice a new skill for 30 minutes', category: 'learning', difficulty: 'hard' },

  // Health
  { id: 'health-water', title: 'Drink a glass of water', category: 'health', difficulty: 'easy' },
  { id: 'health-sleep', title: 'Be in bed by 11pm', category: 'health', difficulty: 'medium' },
  { id: 'health-veggies', title: 'Eat 2 servings of vegetables', category: 'health', difficulty: 'easy' },
  { id: 'health-sunlight', title: 'Get 10 minutes of sunlight', category: 'health', difficulty: 'easy' },
  { id: 'health-nosugar', title: 'No added sugar today', category: 'health', difficulty: 'hard' },

  // Productivity
  { id: 'prod-top-task', title: 'Finish your most important task', category: 'productivity', difficulty: 'medium' },
  { id: 'prod-deepwork', title: 'Deep-work session (25 focused minutes)', category: 'productivity', difficulty: 'hard' },
  { id: 'prod-inbox', title: 'Reach inbox zero', category: 'productivity', difficulty: 'medium' },
  { id: 'prod-plan', title: 'Plan tomorrow tonight', category: 'productivity', difficulty: 'easy' },
  { id: 'prod-tidy', title: 'Tidy your workspace', category: 'productivity', difficulty: 'easy' },

  // Relationships
  { id: 'rel-reachout', title: 'Message someone you care about', category: 'relationships', difficulty: 'easy' },
  { id: 'rel-call', title: 'Call a friend or family member', category: 'relationships', difficulty: 'medium' },
  { id: 'rel-quality', title: 'Spend 30 minutes of quality time, phone away', category: 'relationships', difficulty: 'medium' },
  { id: 'rel-thanks', title: 'Thank someone sincerely', category: 'relationships', difficulty: 'easy' },

  // Creativity
  { id: 'create-sketch', title: 'Sketch or doodle for 10 minutes', category: 'creativity', difficulty: 'easy' },
  { id: 'create-write', title: 'Write 200 words', category: 'creativity', difficulty: 'medium' },
  { id: 'create-music', title: 'Practice an instrument for 20 minutes', category: 'creativity', difficulty: 'medium' },
  { id: 'create-project', title: 'Work on a personal project', category: 'creativity', difficulty: 'hard' },

  // Finance
  { id: 'fin-track', title: 'Log today’s spending', category: 'finance', difficulty: 'easy' },
  { id: 'fin-nospend', title: 'A no-spend day', category: 'finance', difficulty: 'hard' },
  { id: 'fin-review', title: 'Review your budget', category: 'finance', difficulty: 'medium' },
  { id: 'fin-save', title: 'Transfer something to savings', category: 'finance', difficulty: 'medium' },
];

/** Group the library by category, in display order. */
export function libraryByCategory(): { category: QuestCategory; habits: LibraryHabit[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    habits: HABIT_LIBRARY.filter((h) => h.category === category),
  })).filter((section) => section.habits.length > 0);
}

/** Convert a library habit into a concrete Quest with a unique id. */
export function libraryHabitToQuest(habit: LibraryHabit, id: string): Quest {
  return {
    id,
    title: habit.title,
    ...(habit.description ? { description: habit.description } : {}),
    category: habit.category,
    difficulty: habit.difficulty,
    baseXp: QUEST_XP[habit.difficulty],
    completed: false,
  };
}
