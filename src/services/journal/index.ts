import { AsyncStorageStore } from '@/services/storage';
import { JournalStore } from './journalStore';

/** App-wide battle-journal persistence (device AsyncStorage). */
export const journalStore = new JournalStore(new AsyncStorageStore());

export { JournalStore, normalizeJournal, JOURNAL_SCHEMA_VERSION, MAX_ENTRIES, MAX_FOLLOWUPS } from './journalStore';
