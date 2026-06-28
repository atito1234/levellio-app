/**
 * Local persistence for the user's saved/cooked recipes (per-uid). On-device only
 * (KeyValueStore seam) — this collection is personal to the user.
 */
import type { KeyValueStore } from '@/services/storage';
import type { RecipeLogEntry } from '@/types';

const recipesKey = (uid: string) => `levellio:recipes:${uid}`;

function normalize(raw: unknown): RecipeLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is RecipeLogEntry => Boolean(e) && typeof (e as RecipeLogEntry).recipeId === 'string')
    .map((e) => ({
      recipeId: e.recipeId,
      savedAt: typeof e.savedAt === 'number' ? e.savedAt : 0,
      cookedDates: Array.isArray(e.cookedDates) ? e.cookedDates.filter((d): d is string => typeof d === 'string') : [],
      ...(e.custom && typeof e.custom === 'object' && typeof e.custom.title === 'string'
        ? {
            custom: {
              title: e.custom.title,
              description: typeof e.custom.description === 'string' ? e.custom.description : '',
              ingredients: Array.isArray(e.custom.ingredients) ? e.custom.ingredients.filter((x): x is string => typeof x === 'string') : [],
              steps: Array.isArray(e.custom.steps) ? e.custom.steps.filter((x): x is string => typeof x === 'string') : [],
              ...(typeof e.custom.nutritionNote === 'string' ? { nutritionNote: e.custom.nutritionNote } : {}),
            },
          }
        : {}),
    }));
}

export class RecipeStore {
  constructor(private readonly store: KeyValueStore) {}

  async load(uid: string): Promise<RecipeLogEntry[]> {
    const raw = await this.store.getItem(recipesKey(uid));
    if (!raw) return [];
    try {
      return normalize(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  async save(uid: string, entries: RecipeLogEntry[]): Promise<void> {
    await this.store.setItem(recipesKey(uid), JSON.stringify(entries));
  }
}
