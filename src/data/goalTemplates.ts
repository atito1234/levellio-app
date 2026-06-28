/**
 * Starter life-goal templates so a user can set a goal in one tap. Each maps to
 * a few life areas and suggests a handful of library habits to seed it. Framed
 * around the science of habituation: small, repeatable actions that compound.
 */
import type { QuestCategory } from '@/types';

/**
 * A focus-specific follow-up question shown right after "What do you want to work
 * on?". Each option carries `tags` that personalize which activities (and, for the
 * eat focus, which recipes) get recommended. Labels are i18n keys resolved as
 * `funnel.focusDetail.<focusKey>.options.<optionId>` in onboarding.json.
 */
export interface FocusFollowUp {
  /** Answer + i18n key, e.g. 'diet', 'setup'. */
  key: string;
  /** Allow multiple selections (default single-select). */
  multi?: boolean;
  options: { id: string; emoji?: string; tags: string[] }[];
}

export interface GoalTemplate {
  key: string;
  title: string;
  emoji: string;
  colorId: 'violet' | 'teal';
  categories: QuestCategory[];
  /** Library habit ids (see src/data/habitLibrary.ts) to offer when creating it. */
  suggestedHabitIds: string[];
  /** Optional personalization question shown after this focus is chosen. */
  followUp?: FocusFollowUp;
}

export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  {
    key: 'fit',
    title: 'Get fit & strong',
    emoji: '💪',
    colorId: 'violet',
    categories: ['fitness', 'health'],
    suggestedHabitIds: ['fit-walk', 'fit-workout', 'fit-steps', 'health-water'],
    followUp: {
      key: 'setup',
      options: [
        { id: 'beginner', emoji: '🌱', tags: ['level-beginner'] },
        { id: 'home', emoji: '🏠', tags: ['env-home'] },
        { id: 'gym', emoji: '🏋️', tags: ['env-gym'] },
        { id: 'outdoor', emoji: '🌳', tags: ['env-outdoor'] },
      ],
    },
  },
  {
    key: 'eat',
    title: 'Eat healthier',
    emoji: '🥗',
    colorId: 'teal',
    categories: ['health'],
    suggestedHabitIds: ['health-veggies', 'health-water', 'health-nosugar'],
    followUp: {
      key: 'diet',
      options: [
        { id: 'omnivore', emoji: '🍽️', tags: ['diet-omnivore'] },
        { id: 'vegetarian', emoji: '🥕', tags: ['diet-vegetarian'] },
        { id: 'vegan', emoji: '🌱', tags: ['diet-vegan'] },
        { id: 'pescatarian', emoji: '🐟', tags: ['diet-pescatarian'] },
        { id: 'glutenfree', emoji: '🌾', tags: ['diet-gluten-free'] },
      ],
    },
  },
  {
    key: 'partner',
    title: 'Be a better partner',
    emoji: '❤️',
    colorId: 'violet',
    categories: ['relationships', 'mind'],
    suggestedHabitIds: ['rel-quality', 'rel-call', 'rel-thanks'],
    followUp: {
      key: 'bond',
      options: [
        { id: 'quality', emoji: '⏰', tags: ['bond-quality'] },
        { id: 'appreciation', emoji: '💌', tags: ['bond-appreciation'] },
        { id: 'communication', emoji: '💬', tags: ['bond-communication'] },
      ],
    },
  },
  {
    key: 'calm',
    title: 'Lower my stress',
    emoji: '🧘',
    colorId: 'teal',
    categories: ['mind', 'health'],
    suggestedHabitIds: ['mind-breathe', 'mind-meditate', 'health-sleep'],
    followUp: {
      key: 'trigger',
      options: [
        { id: 'work', emoji: '💼', tags: ['calm-work'] },
        { id: 'sleep', emoji: '😴', tags: ['calm-sleep'] },
        { id: 'overwhelm', emoji: '🌊', tags: ['calm-overwhelm'] },
      ],
    },
  },
  {
    key: 'money',
    title: 'Money on track',
    emoji: '💰',
    colorId: 'violet',
    categories: ['finance', 'productivity'],
    suggestedHabitIds: ['fin-track', 'fin-review', 'prod-plan'],
    followUp: {
      key: 'aim',
      options: [
        { id: 'save', emoji: '🐖', tags: ['money-save'] },
        { id: 'budget', emoji: '📊', tags: ['money-budget'] },
        { id: 'debt', emoji: '✂️', tags: ['money-debt'] },
      ],
    },
  },
  {
    key: 'grow',
    title: 'Keep growing',
    emoji: '📚',
    colorId: 'teal',
    categories: ['learning', 'creativity'],
    suggestedHabitIds: ['learn-read', 'learn-skill', 'create-project'],
    followUp: {
      key: 'mode',
      options: [
        { id: 'read', emoji: '📖', tags: ['grow-read'] },
        { id: 'course', emoji: '🎓', tags: ['grow-course'] },
        { id: 'creative', emoji: '🎨', tags: ['grow-creative'] },
      ],
    },
  },
];

/** Look up a goal template by key. */
export function goalTemplateByKey(key: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find((t) => t.key === key);
}
