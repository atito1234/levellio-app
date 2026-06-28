/**
 * Owns the user's saved recipe collection + cooked log (the "recorded in my app"
 * side of the food focus). Mirrors GoalContext: loads per-uid on mount, persists
 * every change through the KeyValueStore seam. Pure curated catalog — no network.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useGame } from '@/state/GameContext';
import { RecipeStore } from '@/services/recipes/recipeStore';
import { AsyncStorageStore } from '@/services/storage';
import { dayKey } from '@/lib/dates';
import type { SuggestedRecipe } from '@/services/ai';
import type { RecipeLogEntry } from '@/types';

const recipeStore = new RecipeStore(new AsyncStorageStore());

interface RecipesContextValue {
  ready: boolean;
  saved: RecipeLogEntry[];
  isSaved: (recipeId: string) => boolean;
  save: (recipeId: string) => Promise<void>;
  /** Save several recipes at once (used when seeding the onboarding plan). */
  saveMany: (recipeIds: readonly string[]) => Promise<void>;
  /** Save an AI-generated/custom recipe (inline content, not in the catalog). */
  saveCustom: (recipe: SuggestedRecipe) => Promise<void>;
  remove: (recipeId: string) => Promise<void>;
  /** Record that the user cooked a recipe today (auto-saves it if needed). */
  markCooked: (recipeId: string) => Promise<void>;
}

const RecipesContext = createContext<RecipesContextValue | null>(null);

export function RecipesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useGame();
  const uid = user?.uid ?? null;

  const [saved, setSaved] = useState<RecipeLogEntry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setSaved([]);
      setReady(false);
      return;
    }
    recipeStore.load(uid).then((loaded) => {
      if (active) {
        setSaved(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [uid]);

  const commit = useCallback(
    async (next: RecipeLogEntry[]) => {
      setSaved(next);
      if (uid) await recipeStore.save(uid, next);
    },
    [uid],
  );

  const isSaved = useCallback((recipeId: string) => saved.some((e) => e.recipeId === recipeId), [saved]);

  const save = useCallback(
    async (recipeId: string) => {
      if (saved.some((e) => e.recipeId === recipeId)) return;
      await commit([...saved, { recipeId, savedAt: Date.now(), cookedDates: [] }]);
    },
    [saved, commit],
  );

  const saveMany = useCallback(
    async (recipeIds: readonly string[]) => {
      const existing = new Set(saved.map((e) => e.recipeId));
      const additions = recipeIds
        .filter((id) => !existing.has(id))
        .map((id) => ({ recipeId: id, savedAt: Date.now(), cookedDates: [] as string[] }));
      if (additions.length) await commit([...saved, ...additions]);
    },
    [saved, commit],
  );

  const saveCustom = useCallback(
    async (recipe: SuggestedRecipe) => {
      const now = Date.now();
      const entry: RecipeLogEntry = {
        recipeId: `ai-${now}`,
        savedAt: now,
        cookedDates: [],
        custom: {
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          ...(recipe.nutritionNote ? { nutritionNote: recipe.nutritionNote } : {}),
        },
      };
      // Skip if an identically-titled custom recipe is already saved.
      if (saved.some((e) => e.custom?.title === recipe.title)) return;
      await commit([...saved, entry]);
    },
    [saved, commit],
  );

  const remove = useCallback(
    async (recipeId: string) => {
      await commit(saved.filter((e) => e.recipeId !== recipeId));
    },
    [saved, commit],
  );

  const markCooked = useCallback(
    async (recipeId: string) => {
      const today = dayKey(new Date());
      const existing = saved.find((e) => e.recipeId === recipeId);
      if (!existing) {
        await commit([...saved, { recipeId, savedAt: Date.now(), cookedDates: [today] }]);
        return;
      }
      if (existing.cookedDates.includes(today)) return;
      await commit(
        saved.map((e) => (e.recipeId === recipeId ? { ...e, cookedDates: [...e.cookedDates, today] } : e)),
      );
    },
    [saved, commit],
  );

  const value = useMemo<RecipesContextValue>(
    () => ({ ready, saved, isSaved, save, saveMany, saveCustom, remove, markCooked }),
    [ready, saved, isSaved, save, saveMany, saveCustom, remove, markCooked],
  );

  return <RecipesContext.Provider value={value}>{children}</RecipesContext.Provider>;
}

export function useRecipes(): RecipesContextValue {
  const ctx = useContext(RecipesContext);
  if (!ctx) throw new Error('useRecipes must be used within a RecipesProvider');
  return ctx;
}
