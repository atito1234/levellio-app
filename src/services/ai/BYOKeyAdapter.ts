/**
 * Bring-your-own-key engine — the user supplies an OpenAI / Anthropic / any
 * key at RUNTIME. The key is read from secure storage via `getApiKey` and is
 * NEVER committed, logged, or stored in plaintext. Without a key it throws so
 * the generator falls back gracefully.
 */
import { AIUnavailableError } from './errors';
import { fetchHttpClient } from './http';
import { mockMotivate } from './mockData';
import type {
  AIEngine,
  HttpClient,
  QuestSuggestionInput,
  SuggestedQuest,
} from './AIEngine';

export type BYOProvider = 'openai' | 'anthropic' | 'custom';

export interface BYOKeyDeps {
  provider: BYOProvider;
  /** Reads the user's key from secure storage at call time. */
  getApiKey: () => Promise<string | null>;
  http?: HttpClient;
  /** Endpoint override for custom/self-hosted providers. */
  baseUrl?: string;
}

export class BYOKeyAdapter implements AIEngine {
  readonly id = 'byo-key' as const;
  readonly label = 'Bring Your Own Key';
  readonly isPrivate = false;

  constructor(private readonly deps: BYOKeyDeps) {}

  async suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]> {
    const key = await this.deps.getApiKey();
    if (!key) throw new AIUnavailableError('No API key provided');

    const http = this.deps.http ?? fetchHttpClient();
    const res = await http(this.endpoint(), {
      method: 'POST',
      headers: this.authHeaders(key),
      body: JSON.stringify({ goal: input.goal, count: input.count ?? 3 }),
    });
    if (!res.ok) throw new AIUnavailableError(`${this.deps.provider} request failed (${res.status})`);

    // TODO(day7+): map each provider's response schema -> SuggestedQuest[].
    if (!(await res.json())) throw new AIUnavailableError('Empty response');
    return [];
  }

  async motivate(context: { streakDays: number; level: number }): Promise<string> {
    return mockMotivate(context);
  }

  private endpoint(): string {
    if (this.deps.baseUrl) return this.deps.baseUrl;
    switch (this.deps.provider) {
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      case 'anthropic':
        return 'https://api.anthropic.com/v1/messages';
      default:
        throw new AIUnavailableError('No endpoint configured for custom provider');
    }
  }

  private authHeaders(key: string): Record<string, string> {
    const base = { 'Content-Type': 'application/json' };
    if (this.deps.provider === 'anthropic') {
      return { ...base, 'x-api-key': key, 'anthropic-version': '2023-06-01' };
    }
    return { ...base, Authorization: `Bearer ${key}` };
  }
}
