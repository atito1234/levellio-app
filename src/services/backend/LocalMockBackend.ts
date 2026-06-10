/**
 * In-memory mock backend. Stands in for Firebase during development.
 * State lives only for the session; swap for a real provider later.
 * TODO(day5+): replace with FirebaseBackend + persist to AsyncStorage/Firestore.
 */
import type { Character, Quest } from '@/types';
import type { AuthUser, BackendService } from './BackendService';

const MOCK_UID = 'local-hero';

function seedCharacter(uid: string): Character {
  return {
    id: uid,
    name: 'Hero',
    presentation: 'neutral',
    level: 1,
    xp: 0,
    streakDays: 0,
    tier: 'novice',
    companionStage: 'spark',
  };
}

function seedQuests(): Quest[] {
  return [
    { id: 'q1', title: 'Drink a glass of water', category: 'habit', difficulty: 'easy', baseXp: 20, completed: false },
    { id: 'q2', title: '20-minute workout', category: 'workout', difficulty: 'medium', baseXp: 40, completed: false },
    { id: 'q3', title: 'Deep-work session on your goal', category: 'goal', difficulty: 'hard', baseXp: 70, completed: false },
  ];
}

export class LocalMockBackend implements BackendService {
  private user: AuthUser | null = null;
  private characters = new Map<string, Character>();
  private quests = new Map<string, Quest[]>();

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.user;
  }

  async signInAnonymously(): Promise<AuthUser> {
    this.user = { uid: MOCK_UID, isAnonymous: true };
    if (!this.characters.has(MOCK_UID)) {
      this.characters.set(MOCK_UID, seedCharacter(MOCK_UID));
      this.quests.set(MOCK_UID, seedQuests());
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
