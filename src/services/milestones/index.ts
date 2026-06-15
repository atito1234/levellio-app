import { AsyncStorageStore } from '@/services/storage';
import { MilestoneStore } from './milestoneStore';

/** App-wide earned-milestone persistence (device AsyncStorage). */
export const milestoneStore = new MilestoneStore(new AsyncStorageStore());

export { MilestoneStore, normalizeMilestones, MILESTONE_SCHEMA_VERSION, MAX_MILESTONES } from './milestoneStore';
