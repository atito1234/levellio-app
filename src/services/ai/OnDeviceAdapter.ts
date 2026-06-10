/**
 * On-device engine (privacy mode).
 *
 * PRIVACY CONTRACT: this adapter holds NO HttpClient and performs NO network
 * I/O whatsoever. Suggestions are produced by a deterministic local heuristic,
 * so user data never leaves the device and the engine works fully offline.
 * TODO(day7+): swap the heuristic for a bundled on-device model.
 */
import { mockMotivate, mockSuggestQuests } from './mockData';
import type { AIEngine, QuestSuggestionInput, SuggestedQuest } from './AIEngine';

export class OnDeviceAdapter implements AIEngine {
  readonly id = 'on-device' as const;
  readonly label = 'On-Device (Private)';
  readonly isPrivate = true;

  async suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]> {
    return mockSuggestQuests(input);
  }

  async motivate(context: { streakDays: number; level: number }): Promise<string> {
    return mockMotivate(context);
  }
}
