import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import type { AuthUser } from '@/services/backend';
import { backend } from '@/services/backend';
import { applyQuestCompletion } from '@/lib/leveling';
import type { Character, HeroPresentation, Quest, QuestReward } from '@/types';

/**
 * Central game state: owns the signed-in user, character, and quests, and is
 * the single place quest completion mutates progression. Screens read from here
 * via `useGame()` and never talk to the backend directly.
 */
interface GameState {
  status: 'idle' | 'loading' | 'ready';
  user: AuthUser | null;
  character: Character | null;
  quests: Quest[];
}

type Action =
  | { type: 'loading' }
  | { type: 'ready'; payload: { user: AuthUser; character: Character | null; quests: Quest[] } }
  | { type: 'update'; payload: { character: Character; quests: Quest[] } };

const initialState: GameState = {
  status: 'idle',
  user: null,
  character: null,
  quests: [],
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'loading':
      return { ...state, status: 'loading' };
    case 'ready':
      return {
        status: 'ready',
        user: action.payload.user,
        character: action.payload.character,
        quests: action.payload.quests,
      };
    case 'update':
      return {
        ...state,
        character: action.payload.character,
        quests: action.payload.quests,
      };
    default:
      return state;
  }
}

interface GameContextValue extends GameState {
  /** Sign in (mock), apply the chosen presentation, and load quests. */
  startGame: (presentation: HeroPresentation) => Promise<void>;
  /** Complete a quest, award XP, persist, and return the reward (or null). */
  completeQuest: (questId: string) => Promise<QuestReward | null>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Restore an existing session on mount (e.g. after a fast refresh).
  useEffect(() => {
    let active = true;
    (async () => {
      const user = await backend.getCurrentUser();
      if (!user || !active) return;
      const [character, quests] = await Promise.all([
        backend.loadCharacter(user.uid),
        backend.loadQuests(user.uid),
      ]);
      if (active) dispatch({ type: 'ready', payload: { user, character, quests } });
    })();
    return () => {
      active = false;
    };
  }, []);

  const startGame = useCallback(async (presentation: HeroPresentation) => {
    dispatch({ type: 'loading' });
    const user = await backend.signInAnonymously();
    const existing = await backend.loadCharacter(user.uid);
    const character = existing ? { ...existing, presentation } : null;
    if (character) await backend.saveCharacter(user.uid, character);
    const quests = await backend.loadQuests(user.uid);
    dispatch({ type: 'ready', payload: { user, character, quests } });
  }, []);

  const completeQuest = useCallback(
    async (questId: string): Promise<QuestReward | null> => {
      if (!state.user || !state.character) return null;
      const quest = state.quests.find((q) => q.id === questId);
      if (!quest || quest.completed) return null;

      // TODO(day7+): advance streakDays on the first completion of each day
      // (needs real date tracking + a daily reset). The leveling math already
      // applies whatever streakDays the character has.
      const { character: nextCharacter, reward } = applyQuestCompletion(
        state.character,
        quest.baseXp,
        questId,
      );
      const nextQuests = state.quests.map((q) =>
        q.id === questId ? { ...q, completed: true } : q,
      );

      dispatch({ type: 'update', payload: { character: nextCharacter, quests: nextQuests } });
      await Promise.all([
        backend.saveCharacter(state.user.uid, nextCharacter),
        backend.saveQuests(state.user.uid, nextQuests),
      ]);
      return reward;
    },
    [state.user, state.character, state.quests],
  );

  const value = useMemo<GameContextValue>(
    () => ({ ...state, startGame, completeQuest }),
    [state, startGame, completeQuest],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Access game state + actions. Must be used within a GameProvider. */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
