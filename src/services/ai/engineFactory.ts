/**
 * Builds the active AI engine from settings. On-device needs nothing; cloud
 * engines receive a `getApiKey` that reads the user's key from secure storage.
 */
import { GeminiAdapter } from './GeminiAdapter';
import { BYOKeyAdapter } from './BYOKeyAdapter';
import { OnDeviceAdapter } from './OnDeviceAdapter';
import type { AIEngine } from './AIEngine';
import type { AppSettings } from '@/services/settings/appSettings';

export interface EngineDeps {
  getApiKey: () => Promise<string | null>;
}

export function buildEngine(settings: AppSettings, deps: EngineDeps): AIEngine {
  if (settings.aiMode === 'on-device') {
    return new OnDeviceAdapter();
  }
  if (settings.provider === 'gemini') {
    return new GeminiAdapter({ getApiKey: deps.getApiKey });
  }
  return new BYOKeyAdapter({ provider: settings.provider, getApiKey: deps.getApiKey });
}
