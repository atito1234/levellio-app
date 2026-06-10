/**
 * Device-persisted backend. Implements the same BackendService interface as the
 * in-memory mock, so character state, XP, streak, and quest completion survive
 * app restarts. Firebase can later implement this interface and swap in with no
 * caller changes.
 */
import type { Character, Quest } from '@/types';
import type { KeyValueStore } from '@/services/storage';
import type { AuthUser, BackendService } from './BackendService';
import { LOCAL_UID, seedCharacter, seedQuests } from './seed';
import { SCHEMA_VERSION, migrateCharacter, migrateQuests } from './migrations';

const NS = 'levellio';
const USER_KEY = `${NS}:user`;
const SCHEMA_KEY = `${NS}:schema`;
const characterKey = (uid: string) => `${NS}:character:${uid}`;
const questsKey = (uid: string) => `${NS}:quests:${uid}`;

export class PersistentBackend implements BackendService {
  constructor(private readonly store: KeyValueStore) {}

  async getCurrentUser(): Promise<AuthUser | null> {
    const raw = await this.store.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  async signInAnonymously(): Promise<AuthUser> {
    let user = await this.getCurrentUser();
    if (!user) {
      user = { uid: LOCAL_UID, isAnonymous: true };
      await this.store.setItem(USER_KEY, JSON.stringify(user));
    }
    // Seed once if this user has no saved state yet.
    const existing = await this.store.getItem(characterKey(user.uid));
    if (!existing) {
      await this.saveCharacter(user.uid, seedCharacter(user.uid));
      await this.saveQuests(user.uid, seedQuests());
    }
    return user;
  }

  async signOut(): Promise<void> {
    await this.store.removeItem(USER_KEY);
  }

  async loadCharacter(uid: string): Promise<Character | null> {
    const raw = await this.store.getItem(characterKey(uid));
    if (!raw) return null;
    try {
      return migrateCharacter(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async saveCharacter(uid: string, character: Character): Promise<void> {
    await this.store.setItem(characterKey(uid), JSON.stringify(character));
    await this.store.setItem(SCHEMA_KEY, String(SCHEMA_VERSION));
  }

  async loadQuests(uid: string): Promise<Quest[]> {
    const raw = await this.store.getItem(questsKey(uid));
    if (!raw) return [];
    try {
      return migrateQuests(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async saveQuests(uid: string, quests: Quest[]): Promise<void> {
    await this.store.setItem(questsKey(uid), JSON.stringify(quests));
  }
}
