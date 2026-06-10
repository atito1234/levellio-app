import { MockSyncService } from './MockSyncService';
import type { SyncService } from './SyncService';

/** Active sync service. Mock today; Firebase later behind the same interface. */
export const syncService: SyncService = new MockSyncService();

export * from './SyncService';
export { MockSyncService } from './MockSyncService';
