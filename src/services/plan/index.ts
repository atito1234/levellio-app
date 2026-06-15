import { AsyncStorageStore } from '@/services/storage';
import { PlanStore } from './planStore';

/** App-wide per-day plan persistence (device AsyncStorage). */
export const planStore = new PlanStore(new AsyncStorageStore());

export { PlanStore, normalizeDays, trimDays, PLAN_SCHEMA_VERSION, MAX_PLAN_DAYS } from './planStore';
export type { PlanData, PlanDays } from './planStore';
