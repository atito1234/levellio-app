/**
 * AI layer entry point. Builds an engine by id and exposes a default.
 * TODO(day8): persist the user's chosen engine (Settings) and read it here.
 */
import type { AIEngine, AIEngineId } from './AIEngine';
import { GeminiAdapter } from './GeminiAdapter';
import { BYOKeyAdapter } from './BYOKeyAdapter';
import { OnDeviceAdapter } from './OnDeviceAdapter';
import { getByoApiKey } from '@/services/security/secureKeyStore';

function geminiKeyFromEnv(): string | null {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  return key && key.length > 0 ? key : null;
}

export function createAIEngine(id: AIEngineId = 'gemini'): AIEngine {
  switch (id) {
    case 'on-device':
      return new OnDeviceAdapter();
    case 'byo-key':
      return new BYOKeyAdapter({ provider: 'openai', getApiKey: () => getByoApiKey() });
    case 'gemini':
    default:
      return new GeminiAdapter({ getApiKey: async () => geminiKeyFromEnv() });
  }
}

/** Default engine until the user picks one in Settings. */
export const defaultAIEngine: AIEngine = createAIEngine('gemini');

export * from './AIEngine';
export * from './errors';
export { GeminiAdapter } from './GeminiAdapter';
export { BYOKeyAdapter } from './BYOKeyAdapter';
export { OnDeviceAdapter } from './OnDeviceAdapter';
export {
  generateQuests,
  suggestedToQuest,
  FALLBACK_QUESTS,
  type GenerateResult,
  type GenerateOptions,
  type QuestSource,
} from './questGenerator';
