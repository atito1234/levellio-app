/**
 * On-device engine (privacy mode) — data never leaves the device.
 * TODO(day5+): load a small on-device model / runtime. Until then this returns
 * the same deterministic mock data, fully offline.
 */
import type {
  AIEngine,
  QuestSuggestionInput,
  SuggestedQuest,
} from './AIEngine';
import { mockSuggestQuests, mockMotivate } from './mockData';

export class OnDeviceAdapter implements AIEngine {
  readonly id = 'on-device' as const;
  readonly label = 'On-Device (Private)';
  readonly isPrivate = true;

  async suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]> {
    // TODO(day5+): run local inference; nothing leaves the device.
    return mockSuggestQuests(input);
  }

  async motivate(context: { streakDays: number; level: number }): Promise<string> {
    // TODO(day5+): local inference.
    return mockMotivate(context);
  }
}
