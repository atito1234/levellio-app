/**
 * App settings (non-secret) persisted via the KeyValueStore. Holds the user's
 * AI preference: on-device (private, no key) or cloud (their own key + provider).
 */
import type { KeyValueStore } from '@/services/storage';

export type AIMode = 'on-device' | 'cloud';
export type CloudProvider = 'gemini' | 'openai' | 'anthropic';

export interface AppSettings {
  aiMode: AIMode;
  provider: CloudProvider;
}

/** Privacy-first default: on-device, no key required. */
export const DEFAULT_SETTINGS: AppSettings = { aiMode: 'on-device', provider: 'gemini' };

const SETTINGS_KEY = 'levellio:settings';

/** Coerce arbitrary stored data into valid settings. */
export function normalizeSettings(raw: unknown): AppSettings {
  const r = (raw ?? {}) as Partial<AppSettings>;
  const aiMode: AIMode = r.aiMode === 'cloud' ? 'cloud' : 'on-device';
  const provider: CloudProvider =
    r.provider === 'openai' || r.provider === 'anthropic' ? r.provider : 'gemini';
  return { aiMode, provider };
}

export class SettingsStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(): Promise<AppSettings> {
    const raw = await this.store.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      return normalizeSettings(JSON.parse(raw));
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async save(settings: AppSettings): Promise<void> {
    await this.store.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
  }

  async update(patch: Partial<AppSettings>): Promise<AppSettings> {
    const next = normalizeSettings({ ...(await this.load()), ...patch });
    await this.save(next);
    return next;
  }
}
