/**
 * AI layer entry point. Selects an engine by id and exposes a default.
 * TODO(day5+): persist the user's chosen engine and read it here.
 */
import type { AIEngine, AIEngineId } from './AIEngine';
import { GeminiAdapter } from './GeminiAdapter';
import { BYOKeyAdapter } from './BYOKeyAdapter';
import { OnDeviceAdapter } from './OnDeviceAdapter';

export function createAIEngine(id: AIEngineId = 'gemini'): AIEngine {
  switch (id) {
    case 'byo-key':
      return new BYOKeyAdapter();
    case 'on-device':
      return new OnDeviceAdapter();
    case 'gemini':
    default:
      return new GeminiAdapter();
  }
}

/** Default engine used until the user picks one in Settings. */
export const defaultAIEngine: AIEngine = createAIEngine('gemini');

export * from './AIEngine';
export { GeminiAdapter } from './GeminiAdapter';
export { BYOKeyAdapter } from './BYOKeyAdapter';
export { OnDeviceAdapter } from './OnDeviceAdapter';
