/**
 * Bring-your-own-key engine — user supplies an OpenAI / Anthropic / any key.
 * TODO(day5+): accept a provider + key from secure on-device storage and call
 * the matching API. The key is provided at runtime by the user and is NEVER
 * committed or hardcoded. Returns mock data for now.
 */
import type {
  AIEngine,
  QuestSuggestionInput,
  SuggestedQuest,
} from './AIEngine';
import { mockSuggestQuests, mockMotivate } from './mockData';

export type BYOProvider = 'openai' | 'anthropic' | 'custom';

export interface BYOKeyConfig {
  provider: BYOProvider;
  /** Supplied at runtime by the user; held only in secure storage. */
  apiKey: string;
  /** Optional override for custom/self-hosted endpoints. */
  baseUrl?: string;
}

export class BYOKeyAdapter implements AIEngine {
  readonly id = 'byo-key' as const;
  readonly label = 'Bring Your Own Key';
  readonly isPrivate = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly _config?: BYOKeyConfig) {}

  async suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]> {
    // TODO(day5+): route to this._config.provider with this._config.apiKey.
    return mockSuggestQuests(input);
  }

  async motivate(context: { streakDays: number; level: number }): Promise<string> {
    // TODO(day5+): call configured provider.
    return mockMotivate(context);
  }
}
