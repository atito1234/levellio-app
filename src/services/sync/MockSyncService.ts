/**
 * In-memory mock of cloud sync. The "remote" lives in memory and merges with
 * pushed snapshots — enough to exercise the sync flow without any network.
 */
import type { GameSnapshot, SyncService } from './SyncService';
import { mergeSnapshots } from './SyncService';

export class MockSyncService implements SyncService {
  private remote: GameSnapshot | null = null;

  async push(snapshot: GameSnapshot): Promise<void> {
    this.remote = this.remote ? mergeSnapshots(this.remote, snapshot) : snapshot;
  }

  async pull(): Promise<GameSnapshot | null> {
    return this.remote;
  }

  async sync(local: GameSnapshot): Promise<GameSnapshot> {
    const merged = this.remote ? mergeSnapshots(local, this.remote) : local;
    this.remote = merged;
    return merged;
  }
}
