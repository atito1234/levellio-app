import { AsyncStorageStore } from '@/services/storage';
import { SettingsStore } from './appSettings';

/** App-wide settings store (device-persisted). */
export const settingsStore = new SettingsStore(new AsyncStorageStore());

export * from './appSettings';
