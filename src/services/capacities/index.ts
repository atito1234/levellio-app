import { AsyncStorageStore } from '@/services/storage';
import { CapacityStore } from './capacityStore';

/** App-wide capacity-level persistence (device AsyncStorage). */
export const capacityStore = new CapacityStore(new AsyncStorageStore());

export { CapacityStore, normalizeLevels, normalizeHistory, CAPACITY_SCHEMA_VERSION } from './capacityStore';
export type { CapacityData, CapacityHistory } from './capacityStore';
