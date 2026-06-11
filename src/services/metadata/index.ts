import { AsyncStorageStore } from '@/services/storage';
import { MetadataStore } from './metadataStore';

/** App-wide metadata event persistence (device AsyncStorage). */
export const metadataStore = new MetadataStore(new AsyncStorageStore());

export {
  MetadataStore,
  normalizeEvents,
  METADATA_SCHEMA_VERSION,
  MAX_METADATA_EVENTS,
} from './metadataStore';
