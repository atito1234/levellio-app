import { AsyncStorageStore } from '@/services/storage';
import { RollupStore } from './rollupStore';

/** App-wide durable daily-rollup persistence (device AsyncStorage). */
export const rollupStore = new RollupStore(new AsyncStorageStore());

export {
  RollupStore,
  normalizeRollup,
  normalizeRollups,
  trimRollups,
  ROLLUP_SCHEMA_VERSION,
  MAX_ROLLUP_DAYS,
} from './rollupStore';
export type { RollupDays } from './rollupStore';
