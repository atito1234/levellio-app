/**
 * AI layer entry point. Builds an engine by id and exposes a default.
 * TODO(day8): persist the user's chosen engine (Settings) and read it here.
 */
import type { AIEngine, AIEngineId } from './AIEngine';
import { GeminiAdapter } from './GeminiAdapter';
import { BYOKeyAdapter } from './BYOKeyAdapter';
import { OnDeviceAdapter } from './OnDeviceAdapter';
import { getByoApiKey } from '@/services/security/secureKeyStore';

/**
 * Build an engine by id. Cloud engines read the user's OWN key from secure
 * storage — we never ship a developer-funded key. On-device is keyless.
 */
export function createAIEngine(id: AIEngineId = 'on-device'): AIEngine {
  switch (id) {
    case 'byo-key':
      return new BYOKeyAdapter({ provider: 'openai', getApiKey: () => getByoApiKey() });
    case 'gemini':
      return new GeminiAdapter({ getApiKey: () => getByoApiKey() });
    case 'on-device':
    default:
      return new OnDeviceAdapter();
  }
}

/** Default engine: privacy-first on-device (no key, no network). */
export const defaultAIEngine: AIEngine = createAIEngine('on-device');

export * from './AIEngine';
export * from './errors';
export { GeminiAdapter, parseGeminiSuggestions } from './GeminiAdapter';
export { BYOKeyAdapter } from './BYOKeyAdapter';
export { OnDeviceAdapter } from './OnDeviceAdapter';
export { buildEngine, type EngineDeps } from './engineFactory';
export {
  generateQuests,
  suggestedToQuest,
  FALLBACK_QUESTS,
  type GenerateResult,
  type GenerateOptions,
  type QuestSource,
} from './questGenerator';
export { generateCoaching, type CoachResult, type CoachOptions } from './coachGenerator';
