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
import { completeQuest as engineCompleteQuest } from '@/lib/gameEngine';
import { buildEngine, generateQuests, suggestedToQuest } from '@/services/ai';
import { settingsStore } from '@/services/settings';
import { getByoApiKey } from '@/services/security/secureKeyStore';
import { addQuestToList, removeQuestFromList, updateQuestInList } from '@/lib/questCrud';
import { draftToQuest, validateQuestDraft, type QuestDraft } from '@/lib/questForm';
import { libraryHabitToQuest, type LibraryHabit } from '@/data/habitLibrary';
import { NO_KIT_ID } from '@/data/worldCupKits';
import type { Character, HeroPresentation, Quest, QuestReward } from '@/types';

let questSeq = 0;
function genQuestId(): string {
  questSeq += 1;
  return `quest-${Date.now()}-${questSeq}`;
}

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
  /** Generate a quest from a goal via the active AI engine (with fallback). */
  suggestQuest: (goal: string) => Promise<Quest | null>;
  /** Create a quest from a manual draft. Returns null if the draft is invalid. */
  addQuest: (draft: QuestDraft) => Promise<Quest | null>;
  /** Edit an existing quest from a draft. Returns false if invalid/not found. */
  updateQuest: (questId: string, draft: QuestDraft) => Promise<boolean>;
  /** Delete a quest. */
  deleteQuest: (questId: string) => Promise<void>;
  /** Add a curated library habit to active quests in one tap. */
  addLibraryHabit: (habit: LibraryHabit) => Promise<Quest | null>;
  /** Update the hero presentation (female / male / neutral) and persist. */
  setPresentation: (presentation: HeroPresentation) => Promise<void>;
  /** Select a World Cup nation kit (or NO_KIT_ID for the classic look) and persist. */
  setKit: (kitId: string) => Promise<void>;
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

      // Real date-based completion: advances the daily streak and awards XP.
      const { character: nextCharacter, reward } = engineCompleteQuest(
        state.character,
        quest.baseXp,
        questId,
        new Date(),
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

  // Shared helper: dispatch + persist a new quest list, returning a value.
  const persistQuests = useCallback(
    async <T,>(nextQuests: Quest[], result: T): Promise<T | null> => {
      if (!state.user || !state.character) return null;
      dispatch({ type: 'update', payload: { character: state.character, quests: nextQuests } });
      await backend.saveQuests(state.user.uid, nextQuests);
      return result;
    },
    [state.user, state.character],
  );

  const suggestQuest = useCallback(
    async (goal: string): Promise<Quest | null> => {
      if (!state.user || !state.character) return null;
      // Build the engine the user selected (on-device by default; cloud uses
      // their own key from secure storage). Always falls back gracefully.
      const settings = await settingsStore.load();
      const engine = buildEngine(settings, { getApiKey: () => getByoApiKey() });
      const { quests: suggestions } = await generateQuests(engine, { goal, count: 1 });
      const first = suggestions[0];
      if (!first) return null;

      const quest = suggestedToQuest(first, genQuestId());
      return persistQuests(addQuestToList(state.quests, quest), quest);
    },
    [state.user, state.character, state.quests, persistQuests],
  );

  const addQuest = useCallback(
    async (draft: QuestDraft): Promise<Quest | null> => {
      if (!validateQuestDraft(draft).valid) return null;
      const quest = draftToQuest(draft, genQuestId());
      return persistQuests(addQuestToList(state.quests, quest), quest);
    },
    [state.quests, persistQuests],
  );

  const updateQuest = useCallback(
    async (questId: string, draft: QuestDraft): Promise<boolean> => {
      if (!validateQuestDraft(draft).valid) return false;
      if (!state.quests.some((q) => q.id === questId)) return false;
      const next = updateQuestInList(state.quests, questId, {
        title: draft.title.trim(),
        description: draft.description?.trim() || undefined,
        category: draft.category,
        difficulty: draft.difficulty,
        baseXp: draftToQuest(draft, questId).baseXp,
      });
      return (await persistQuests(next, true)) ?? false;
    },
    [state.quests, persistQuests],
  );

  const deleteQuest = useCallback(
    async (questId: string): Promise<void> => {
      await persistQuests(removeQuestFromList(state.quests, questId), true);
    },
    [state.quests, persistQuests],
  );

  const addLibraryHabit = useCallback(
    async (habit: LibraryHabit): Promise<Quest | null> => {
      const quest = libraryHabitToQuest(habit, genQuestId());
      return persistQuests(addQuestToList(state.quests, quest), quest);
    },
    [state.quests, persistQuests],
  );

  const setPresentation = useCallback(
    async (presentation: HeroPresentation): Promise<void> => {
      if (!state.user || !state.character) return;
      const next: Character = { ...state.character, presentation };
      dispatch({ type: 'update', payload: { character: next, quests: state.quests } });
      await backend.saveCharacter(state.user.uid, next);
    },
    [state.user, state.character, state.quests],
  );

  const setKit = useCallback(
    async (kitId: string): Promise<void> => {
      if (!state.user || !state.character) return;
      // NO_KIT_ID clears back to the classic hoodie (stored as undefined).
      const next: Character = { ...state.character, kitId: kitId === NO_KIT_ID ? undefined : kitId };
      dispatch({ type: 'update', payload: { character: next, quests: state.quests } });
      await backend.saveCharacter(state.user.uid, next);
    },
    [state.user, state.character, state.quests],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      ...state,
      startGame,
      completeQuest,
      suggestQuest,
      addQuest,
      updateQuest,
      deleteQuest,
      addLibraryHabit,
      setPresentation,
      setKit,
    }),
    [
      state,
      startGame,
      completeQuest,
      suggestQuest,
      addQuest,
      updateQuest,
      deleteQuest,
      addLibraryHabit,
      setPresentation,
      setKit,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Access game state + actions. Must be used within a GameProvider. */
export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within a GameProvider');
  return ctx;
}
