import { AsyncStorageStore } from '@/services/storage';
import { BucketStore } from './bucketStore';

/** App-wide bucket persistence (device AsyncStorage). */
export const bucketStore = new BucketStore(new AsyncStorageStore());

export { BucketStore, normalizeBucketState, BUCKET_SCHEMA_VERSION } from './bucketStore';
