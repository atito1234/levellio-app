import { SettingsStore, normalizeSettings, DEFAULT_SETTINGS } from './appSettings';
import { DEFAULT_METADATA_PRIVACY } from '@/lib/metadata';
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
      isPremium: false,
      cosmeticThemeId: 'classic',
      bucketViewMode: 'list',
      metadataPrivacy: DEFAULT_METADATA_PRIVACY,
      hapticsEnabled: true,
      worldProjectsEnabled: false,
      worldProjectAlerts: false,
    });
  });

  it('coerces the premium flag to a strict boolean', () => {
    expect(normalizeSettings({ isPremium: true }).isPremium).toBe(true);
    expect(normalizeSettings({ isPremium: 'yes' as unknown as boolean }).isPremium).toBe(false);
  });

  it('remembers the bucket view mode (defaults to list)', () => {
    expect(normalizeSettings({}).bucketViewMode).toBe('list');
    expect(normalizeSettings({ bucketViewMode: 'buckets' }).bucketViewMode).toBe('buckets');
    expect(normalizeSettings({ bucketViewMode: 'weird' as never }).bucketViewMode).toBe('list');
  });

  it('defaults haptics on, world projects + alerts off (opt-in)', () => {
    const d = normalizeSettings({});
    expect(d.hapticsEnabled).toBe(true);
    expect(d.worldProjectsEnabled).toBe(false);
    expect(d.worldProjectAlerts).toBe(false);
    expect(normalizeSettings({ hapticsEnabled: false }).hapticsEnabled).toBe(false);
    expect(normalizeSettings({ worldProjectsEnabled: true }).worldProjectsEnabled).toBe(true);
    expect(normalizeSettings({ worldProjectAlerts: 'yes' as unknown as boolean }).worldProjectAlerts).toBe(false);
  });

  it('normalizes metadata privacy with privacy-preserving defaults', () => {
    const p = normalizeSettings({}).metadataPrivacy;
    expect(p).toEqual(DEFAULT_METADATA_PRIVACY);
    expect(p.includeSourceActivities).toBe(false);
    expect(p.includeContext).toBe(false);
    const custom = normalizeSettings({
      metadataPrivacy: { includeContext: true, recordContribution: false },
    }).metadataPrivacy;
    expect(custom.includeContext).toBe(true);
    expect(custom.recordContribution).toBe(false);
  });
});

describe('SettingsStore', () => {
  it('returns defaults when nothing is saved', async () => {
    const store = new SettingsStore(new InMemoryStore());
    expect(await store.load()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const store = new SettingsStore(new InMemoryStore());
    await store.save({
      aiMode: 'cloud',
      provider: 'openai',
      isPremium: true,
      cosmeticThemeId: 'emerald',
      bucketViewMode: 'buckets',
      metadataPrivacy: { ...DEFAULT_METADATA_PRIVACY, includeContext: true },
      hapticsEnabled: false,
      worldProjectsEnabled: true,
      worldProjectAlerts: true,
    });
    const loaded = await store.load();
    expect(loaded.bucketViewMode).toBe('buckets');
    expect(loaded.metadataPrivacy.includeContext).toBe(true);
    expect(loaded.isPremium).toBe(true);
  });

  it('update merges a partial patch', async () => {
    const store = new SettingsStore(new InMemoryStore());
    const next = await store.update({ bucketViewMode: 'buckets' });
    expect(next.bucketViewMode).toBe('buckets');
    expect(next.aiMode).toBe('on-device');
  });
});
