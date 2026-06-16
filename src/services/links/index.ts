import { AsyncStorageStore } from '@/services/storage';
import { LinkStore } from './linkStore';

/** App-wide explicit activity-link persistence (device AsyncStorage). */
export const linkStore = new LinkStore(new AsyncStorageStore());

export { LinkStore, LINK_SCHEMA_VERSION } from './linkStore';
