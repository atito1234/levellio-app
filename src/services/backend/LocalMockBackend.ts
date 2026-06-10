/**
 * In-memory mock backend. Useful for tests and as a no-persistence fallback.
 * State lives only for the session. The PersistentBackend is used in the app.
 */
import type { Character, Quest } from '@/types';
import type { AuthUser, BackendService } from './BackendService';
import { LOCAL_UID, seedCharacter, seedQuests } from './seed';

export class LocalMockBackend implements BackendService {
  private user: AuthUser | null = null;
  private characters = new Map<string, Character>();
  private quests = new Map<string, Quest[]>();

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.user;
  }

  async signInAnonymously(): Promise<AuthUser> {
    this.user = { uid: LOCAL_UID, isAnonymous: true };
    if (!this.characters.has(LOCAL_UID)) {
      this.characters.set(LOCAL_UID, seedCharacter(LOCAL_UID));
      this.quests.set(LOCAL_UID, seedQuests());
    }
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = null;
  }

  async loadCharacter(uid: string): Promise<Character | null> {
    return this.characters.get(uid) ?? null;
  }

  async saveCharacter(uid: string, character: Character): Promise<void> {
    this.characters.set(uid, character);
  }

  async loadQuests(uid: string): Promise<Quest[]> {
    return this.quests.get(uid) ?? [];
  }

  async saveQuests(uid: string, quests: Quest[]): Promise<void> {
    this.quests.set(uid, quests);
  }
}
