import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { AppState } from 'react-native';
import { dayKey } from '@/lib/dates';
import { rolloverQuests } from '@/lib/habitDay';
import type { AuthUser } from '@/services/backend';
import { backend } from '@/services/backend';
import { migrateDuplicatesOnce } from '@/services/backend/dedupeMigration';
import { completeQuest as engineCompleteQuest } from '@/lib/gameEngine';
import { buildEngine, generateQuests, suggestedToQuest } from '@/services/ai';
import { settingsStore } from '@/services/settings';
import { getByoApiKey } from '@/services/security/secureKeyStore';
import { removeQuestFromList, updateQuestInList, upsertQuestByCanonical } from '@/lib/questCrud';
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
  /** Delete many quests in one write (Settings danger zone). */
  deleteQuests: (questIds: readonly string[]) => Promise<void>;
  /** Apply recurrence (scheduledDays) edits to many quests in one write. */
  setRecurrence: (edits: readonly { id: string; scheduledDays: number[] }[]) => Promise<void>;
  /** Add a curated library habit to active quests in one tap. */
  addLibraryHabit: (habit: LibraryHabit) => Promise<Quest | null>;
  /** Update the hero presentation (female / male / neutral) and persist. */
  setPresentation: (presentation: HeroPresentation) => Promise<void>;
  /** Select a World Cup nation kit (or NO_KIT_ID for the classic look) and persist. */
  setKit: (kitId: string) => Promise<void>;
  /** Replace the quest order (e.g. re-prioritizing the focus) and persist. */
  reorderQuests: (next: Quest[]) => Promise<void>;
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
      // One-time: collapse any legacy duplicate activities into a single canonical
      // one (repointing plan + buckets), then daily-reset for today.
      const { quests: deduped } = await migrateDuplicatesOnce(
        user.uid,
        () => Promise.resolve(quests),
        (q) => backend.saveQuests(user.uid, q),
      );
      const rolled = rolloverQuests(deduped, dayKey(new Date()));
      if (rolled.changed) await backend.saveQuests(user.uid, rolled.quests);
      if (active) dispatch({ type: 'ready', payload: { user, character, quests: rolled.quests } });
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keep a live ref to state for the foreground listener (no re-subscribe churn).
  const stateRef = useRef(state);
  stateRef.current = state;
  // Live ref to the quest list so sequential awaited mutations (e.g. bulk add)
  // compose instead of each reading the same stale render snapshot.
  const questsRef = useRef(state.quests);
  questsRef.current = state.quests;

  // When the app returns to the foreground, roll over to the new day if needed.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      const s = stateRef.current;
      if (!s.user || !s.character) return;
      const rolled = rolloverQuests(s.quests, dayKey(new Date()));
      if (rolled.changed) {
        dispatch({ type: 'update', payload: { character: s.character, quests: rolled.quests } });
        void backend.saveQuests(s.user.uid, rolled.quests);
      }
    });
    return () => sub.remove();
  }, []);

  const startGame = useCallback(async (presentation: HeroPresentation) => {
    dispatch({ type: 'loading' });
    const user = await backend.signInAnonymously();
    const existing = await backend.loadCharacter(user.uid);
    const character = existing ? { ...existing, presentation } : null;
    if (character) await backend.saveCharacter(user.uid, character);
    const quests = await backend.loadQuests(user.uid);
    const { quests: deduped } = await migrateDuplicatesOnce(
      user.uid,
      () => Promise.resolve(quests),
      (q) => backend.saveQuests(user.uid, q),
    );
    const rolled = rolloverQuests(deduped, dayKey(new Date()));
    if (rolled.changed) await backend.saveQuests(user.uid, rolled.quests);
    dispatch({ type: 'ready', payload: { user, character, quests: rolled.quests } });
  }, []);

  const completeQuest = useCallback(
    async (questId: string): Promise<QuestReward | null> => {
      const s = stateRef.current;
      if (!s.user || !s.character) return null;
      const quest = questsRef.current.find((q) => q.id === questId);
      if (!quest || quest.completed) return null;

      // Real date-based completion: advances the daily streak and awards XP.
      const { character: nextCharacter, reward } = engineCompleteQuest(
        s.character,
        quest.baseXp,
        questId,
        new Date(),
      );
      const nextQuests = questsRef.current.map((q) =>
        q.id === questId ? { ...q, completed: true, lastCompletedDate: dayKey(new Date()) } : q,
      );

      questsRef.current = nextQuests;
      dispatch({ type: 'update', payload: { character: nextCharacter, quests: nextQuests } });
      await Promise.all([
        backend.saveCharacter(s.user.uid, nextCharacter),
        backend.saveQuests(s.user.uid, nextQuests),
      ]);
      return reward;
    },
    [],
  );

  // Shared helper: dispatch + persist a new quest list, returning a value. Reads
  // refs so it's stable and composes across sequential awaited calls.
  const persistQuests = useCallback(
    async <T,>(nextQuests: Quest[], result: T): Promise<T | null> => {
      const s = stateRef.current;
      if (!s.user || !s.character) return null;
      questsRef.current = nextQuests;
      dispatch({ type: 'update', payload: { character: s.character, quests: nextQuests } });
      await backend.saveQuests(s.user.uid, nextQuests);
      return result;
    },
    [],
  );

  const suggestQuest = useCallback(
    async (goal: string): Promise<Quest | null> => {
      const s = stateRef.current;
      if (!s.user || !s.character) return null;
      // Build the engine the user selected (on-device by default; cloud uses
      // their own key from secure storage). Always falls back gracefully.
      const settings = await settingsStore.load();
      const engine = buildEngine(settings, { getApiKey: () => getByoApiKey() });
      const { quests: suggestions } = await generateQuests(engine, { goal, count: 1 });
      const first = suggestions[0];
      if (!first) return null;

      // Merge instead of appending so the AI path can't create a duplicate.
      const { quests, quest } = upsertQuestByCanonical(questsRef.current, suggestedToQuest(first, genQuestId()));
      return persistQuests(quests, quest);
    },
    [persistQuests],
  );

  const addQuest = useCallback(
    async (draft: QuestDraft): Promise<Quest | null> => {
      if (!validateQuestDraft(draft).valid) return null;
      const { quests, quest } = upsertQuestByCanonical(questsRef.current, draftToQuest(draft, genQuestId()));
      return persistQuests(quests, quest);
    },
    [persistQuests],
  );

  const updateQuest = useCallback(
    async (questId: string, draft: QuestDraft): Promise<boolean> => {
      if (!validateQuestDraft(draft).valid) return false;
      if (!questsRef.current.some((q) => q.id === questId)) return false;
      const next = updateQuestInList(questsRef.current, questId, {
        title: draft.title.trim(),
        description: draft.description?.trim() || undefined,
        category: draft.category,
        difficulty: draft.difficulty,
        baseXp: draftToQuest(draft, questId).baseXp,
        scheduledTime: draftToQuest(draft, questId).scheduledTime,
        scheduledDays: draftToQuest(draft, questId).scheduledDays,
        metric: draft.metric,
        why: draft.why?.trim() || undefined,
      });
      return (await persistQuests(next, true)) ?? false;
    },
    [persistQuests],
  );

  const deleteQuest = useCallback(
    async (questId: string): Promise<void> => {
      await persistQuests(removeQuestFromList(questsRef.current, questId), true);
    },
    [persistQuests],
  );

  const deleteQuests = useCallback(
    async (questIds: readonly string[]): Promise<void> => {
      if (questIds.length === 0) return;
      const drop = new Set(questIds);
      await persistQuests(questsRef.current.filter((q) => !drop.has(q.id)), true);
    },
    [persistQuests],
  );

  const setRecurrence = useCallback(
    async (edits: readonly { id: string; scheduledDays: number[] }[]): Promise<void> => {
      if (edits.length === 0) return;
      const byId = new Map(edits.map((e) => [e.id, e.scheduledDays]));
      const next = questsRef.current.map((q) =>
        byId.has(q.id) ? { ...q, scheduledDays: byId.get(q.id)! } : q,
      );
      await persistQuests(next, true);
    },
    [persistQuests],
  );

  const addLibraryHabit = useCallback(
    async (habit: LibraryHabit): Promise<Quest | null> => {
      const { quests, quest } = upsertQuestByCanonical(questsRef.current, libraryHabitToQuest(habit, genQuestId()));
      return persistQuests(quests, quest);
    },
    [persistQuests],
  );

  const reorderQuests = useCallback(
    async (next: Quest[]): Promise<void> => {
      await persistQuests(next, true);
    },
    [persistQuests],
  );

  const setPresentation = useCallback(
    async (presentation: HeroPresentation): Promise<void> => {
      const s = stateRef.current;
      if (!s.user || !s.character) return;
      const next: Character = { ...s.character, presentation };
      dispatch({ type: 'update', payload: { character: next, quests: questsRef.current } });
      await backend.saveCharacter(s.user.uid, next);
    },
    [],
  );

  const setKit = useCallback(
    async (kitId: string): Promise<void> => {
      const s = stateRef.current;
      if (!s.user || !s.character) return;
      // NO_KIT_ID clears back to the classic hoodie (stored as undefined).
      const next: Character = { ...s.character, kitId: kitId === NO_KIT_ID ? undefined : kitId };
      dispatch({ type: 'update', payload: { character: next, quests: questsRef.current } });
      await backend.saveCharacter(s.user.uid, next);
    },
    [],
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
      deleteQuests,
      setRecurrence,
      addLibraryHabit,
      setPresentation,
      setKit,
      reorderQuests,
    }),
    [
      state,
      startGame,
      completeQuest,
      suggestQuest,
      addQuest,
      updateQuest,
      deleteQuest,
      deleteQuests,
      setRecurrence,
      addLibraryHabit,
      setPresentation,
      setKit,
      reorderQuests,
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
