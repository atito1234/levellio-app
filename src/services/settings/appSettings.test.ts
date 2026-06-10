import { SettingsStore, normalizeSettings, DEFAULT_SETTINGS } from './appSettings';
import { InMemoryStore } from '@/services/storage/InMemoryStore';

describe('normalizeSettings', () => {
  it('falls back to safe defaults for junk', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ aiMode: 'nonsense', provider: 'nope' })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values', () => {
    expect(normalizeSettings({ aiMode: 'cloud', provider: 'anthropic' })).toEqual({
      aiMode: 'cloud',
      provider: 'anthropic',
    });
  });
});

describe('SettingsStore', () => {
  it('returns defaults when nothing is saved', async () => {
    const store = new SettingsStore(new InMemoryStore());
    expect(await store.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const store = new SettingsStore(new InMemoryStore());
    await store.save({ aiMode: 'cloud', provider: 'openai' });
    expect(await store.load()).toEqual({ aiMode: 'cloud', provider: 'openai' });
  });

  it('update merges a partial patch', async () => {
    const store = new SettingsStore(new InMemoryStore());
    const next = await store.update({ aiMode: 'cloud' });
    expect(next.aiMode).toBe('cloud');
    expect(next.provider).toBe('gemini');
  });
});
