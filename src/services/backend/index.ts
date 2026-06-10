/**
 * Backend entry point. The app persists to the device via AsyncStorage; tests
 * and fallbacks can use the in-memory mock. Swapping to Firebase later only
 * requires a new BackendService implementation here.
 */
import type { BackendService } from './BackendService';
import { PersistentBackend } from './PersistentBackend';
import { AsyncStorageStore } from '@/services/storage';

export const backend: BackendService = new PersistentBackend(new AsyncStorageStore());

export * from './BackendService';
export { LocalMockBackend } from './LocalMockBackend';
export { PersistentBackend } from './PersistentBackend';
export { LOCAL_UID, seedCharacter, seedQuests } from './seed';
export { SCHEMA_VERSION, migrateCharacter, migrateQuests } from './migrations';
