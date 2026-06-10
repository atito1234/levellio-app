/**
 * Gemini engine (cloud, default).
 * TODO(day5+): call the Gemini API. The key MUST come from secure runtime
 * config / remote config — never hardcode it. For now returns mock data.
 */
import type {
  AIEngine,
  QuestSuggestionInput,
  SuggestedQuest,
} from './AIEngine';
import { mockSuggestQuests, mockMotivate } from './mockData';

export class GeminiAdapter implements AIEngine {
  readonly id = 'gemini' as const;
  readonly label = 'Gemini (Cloud)';
  readonly isPrivate = false;

  async suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]> {
    // TODO(day5+): POST to Gemini, map response -> SuggestedQuest[].
    return mockSuggestQuests(input);
  }

  async motivate(context: { streakDays: number; level: number }): Promise<string> {
    // TODO(day5+): prompt Gemini for a tailored line.
    return mockMotivate(context);
  }
}
