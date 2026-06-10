/**
 * Gemini engine (cloud, default). The API key MUST come from runtime config
 * (env / secure config) — never hardcoded. Without a key it throws
 * AIUnavailableError so the generator falls back gracefully.
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

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface GeminiDeps {
  getApiKey: () => Promise<string | null>;
  http?: HttpClient;
}

export class GeminiAdapter implements AIEngine {
  readonly id = 'gemini' as const;
  readonly label = 'Gemini (Cloud)';
  readonly isPrivate = false;

  constructor(private readonly deps: GeminiDeps) {}

  async suggestQuests(input: QuestSuggestionInput): Promise<SuggestedQuest[]> {
    const key = await this.deps.getApiKey();
    if (!key) throw new AIUnavailableError('No Gemini API key configured');

    const http = this.deps.http ?? fetchHttpClient();
    const res = await http(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildRequest(input)),
    });
    if (!res.ok) throw new AIUnavailableError(`Gemini request failed (${res.status})`);

    // TODO(day7+): map the real Gemini response schema -> SuggestedQuest[].
    return parseSuggestions(await res.json());
  }

  async motivate(context: { streakDays: number; level: number }): Promise<string> {
    // Motivational copy is low-stakes; keep it offline-safe.
    return mockMotivate(context);
  }
}

function buildRequest(input: QuestSuggestionInput): unknown {
  const count = input.count ?? 3;
  return {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `Suggest ${count} short real-life quests for the goal "${input.goal}". Return concise titles.`,
          },
        ],
      },
    ],
  };
}

function parseSuggestions(data: unknown): SuggestedQuest[] {
  // Defensive: any unexpected shape throws so the caller can fall back.
  if (!data || typeof data !== 'object') {
    throw new AIUnavailableError('Unexpected Gemini response');
  }
  // TODO(day7+): real extraction. Until wired, treat as no usable suggestions.
  return [];
}
