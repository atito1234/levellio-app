/**
 * Backend abstraction — auth + data persistence.
 *
 * Firebase is the planned provider (auth + cloud sync) but the app depends only
 * on this interface. A local mock implements it today so nothing is blocked on
 * real credentials. The placeholder app id is `app.levellio.placeholder`.
 *
 * TODO(day5+): add a FirebaseBackend implementing this interface. Config MUST
 * come from runtime env / secure config — NO real secrets in the repo.
 */
import type { Character, Quest } from '@/types';
import type { AuthUser } from '@/services/auth/AuthService';

export type { AuthUser };

export interface BackendService {
  // --- Auth ---
  getCurrentUser(): Promise<AuthUser | null>;
  signInAnonymously(): Promise<AuthUser>;
  signOut(): Promise<void>;

  // --- Character ---
  loadCharacter(uid: string): Promise<Character | null>;
  saveCharacter(uid: string, character: Character): Promise<void>;

  // --- Quests ---
  loadQuests(uid: string): Promise<Quest[]>;
  saveQuests(uid: string, quests: Quest[]): Promise<void>;
}
