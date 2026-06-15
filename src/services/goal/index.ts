import { AsyncStorageStore } from '@/services/storage';
import { GoalStore } from './goalStore';

/** App-wide life-goal persistence (device AsyncStorage). */
export const goalStore = new GoalStore(new AsyncStorageStore());

export { GoalStore, normalizeGoals, GOAL_SCHEMA_VERSION, MAX_GOALS } from './goalStore';
