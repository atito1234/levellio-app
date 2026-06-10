/**
 * Shared deterministic mock data for the AI adapters.
 * TODO(day5+): remove once real engines are wired.
 */
import type { SuggestedQuest } from './AIEngine';
import type { QuestSuggestionInput } from './AIEngine';

export function mockSuggestQuests(input: QuestSuggestionInput): SuggestedQuest[] {
  const category = input.category ?? 'productivity';
  const goal = input.goal.trim() || 'feel a little better today';
  const pool: SuggestedQuest[] = [
    { title: `Take one small step toward "${goal}"`, category, difficulty: 'easy' },
    { title: `Spend 20 focused minutes on "${goal}"`, category, difficulty: 'medium' },
    { title: `Push hard on "${goal}" today`, category, difficulty: 'hard' },
  ];
  const count = Math.max(1, Math.min(input.count ?? pool.length, pool.length));
  return pool.slice(0, count);
}

export function mockMotivate(context: { streakDays: number; level: number }): string {
  if (context.streakDays >= 7) {
    return `Day ${context.streakDays}. You're unstoppable, Luminary in the making.`;
  }
  if (context.level >= 5) {
    return 'Level by level, you are becoming who you set out to be.';
  }
  return 'Every quest counts. One step today beats none.';
}
