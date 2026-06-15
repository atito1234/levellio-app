/**
 * Starter life-goal templates so a user can set a goal in one tap. Each maps to
 * a few life areas and suggests a handful of library habits to seed it. Framed
 * around the science of habituation: small, repeatable actions that compound.
 */
import type { QuestCategory } from '@/types';

export interface GoalTemplate {
  key: string;
  title: string;
  emoji: string;
  colorId: 'violet' | 'teal';
  categories: QuestCategory[];
  /** Library habit ids (see src/data/habitLibrary.ts) to offer when creating it. */
  suggestedHabitIds: string[];
}

export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  {
    key: 'fit',
    title: 'Get fit & strong',
    emoji: '💪',
    colorId: 'violet',
    categories: ['fitness', 'health'],
    suggestedHabitIds: ['fit-walk', 'fit-workout', 'fit-steps', 'health-water'],
  },
  {
    key: 'eat',
    title: 'Eat healthier',
    emoji: '🥗',
    colorId: 'teal',
    categories: ['health'],
    suggestedHabitIds: ['health-veggies', 'health-water', 'health-nosugar'],
  },
  {
    key: 'partner',
    title: 'Be a better partner',
    emoji: '❤️',
    colorId: 'violet',
    categories: ['relationships', 'mind'],
    suggestedHabitIds: ['rel-quality', 'rel-call', 'rel-thanks'],
  },
  {
    key: 'calm',
    title: 'Lower my stress',
    emoji: '🧘',
    colorId: 'teal',
    categories: ['mind', 'health'],
    suggestedHabitIds: ['mind-breathe', 'mind-meditate', 'health-sleep'],
  },
  {
    key: 'money',
    title: 'Money on track',
    emoji: '💰',
    colorId: 'violet',
    categories: ['finance', 'productivity'],
    suggestedHabitIds: ['fin-track', 'fin-review', 'prod-plan'],
  },
  {
    key: 'grow',
    title: 'Keep growing',
    emoji: '📚',
    colorId: 'teal',
    categories: ['learning', 'creativity'],
    suggestedHabitIds: ['learn-read', 'learn-skill', 'create-project'],
  },
];
