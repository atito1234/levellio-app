import { AsyncStorageStore } from '@/services/storage';
import { BattleStore } from './battleStore';

/** App-wide battle progression persistence (device AsyncStorage). */
export const battleStore = new BattleStore(new AsyncStorageStore());

export {
  BattleStore,
  normalizeBattleProgress,
  EMPTY_BATTLE_PROGRESS,
  BATTLE_SCHEMA_VERSION,
  type BattleProgress,
} from './battleStore';
