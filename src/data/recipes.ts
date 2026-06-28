/**
 * Curated, honest recipe catalog for the "eat" focus. NO AI — a small, vetted set
 * of simple meals so a user who picks a dietary profile in onboarding gets real,
 * matching suggestions they can save and cook. All user-facing strings (title,
 * description, ingredients, steps, nutrition note) live in i18n (`recipes`
 * namespace, keyed by id) so they localize to en/es/fr; this file holds only
 * structured metadata used for filtering and display.
 */
import type { DietaryTag, Recipe } from '@/types';

export const RECIPE_CATALOG: readonly Recipe[] = [
  { id: 'veg-stirfry', dietaryTags: ['vegan', 'vegetarian', 'gluten-free'], goalKeys: ['eat'], prepTimeMin: 20, difficulty: 'easy', servings: 2, emoji: '🥦' },
  { id: 'chickpea-curry', dietaryTags: ['vegan', 'vegetarian', 'high-protein'], goalKeys: ['eat'], prepTimeMin: 25, difficulty: 'easy', servings: 2, emoji: '🍛' },
  { id: 'lentil-soup', dietaryTags: ['vegan', 'vegetarian', 'gluten-free', 'high-protein'], goalKeys: ['eat'], prepTimeMin: 30, difficulty: 'easy', servings: 4, emoji: '🍲' },
  { id: 'quinoa-salad', dietaryTags: ['vegan', 'vegetarian', 'gluten-free'], goalKeys: ['eat'], prepTimeMin: 15, difficulty: 'easy', servings: 2, emoji: '🥗' },
  { id: 'overnight-oats', dietaryTags: ['vegetarian', 'low-sugar'], goalKeys: ['eat'], prepTimeMin: 5, difficulty: 'easy', servings: 1, emoji: '🥣' },
  { id: 'greek-yogurt-bowl', dietaryTags: ['vegetarian', 'high-protein', 'low-sugar'], goalKeys: ['eat'], prepTimeMin: 5, difficulty: 'easy', servings: 1, emoji: '🍓' },
  { id: 'salmon-bowl', dietaryTags: ['pescatarian', 'high-protein', 'gluten-free'], goalKeys: ['eat'], prepTimeMin: 25, difficulty: 'medium', servings: 2, emoji: '🐟' },
  { id: 'tuna-salad', dietaryTags: ['pescatarian', 'high-protein', 'low-sugar'], goalKeys: ['eat'], prepTimeMin: 10, difficulty: 'easy', servings: 1, emoji: '🥗' },
  { id: 'chicken-veg', dietaryTags: ['omnivore', 'high-protein', 'gluten-free'], goalKeys: ['eat'], prepTimeMin: 30, difficulty: 'medium', servings: 2, emoji: '🍗' },
  { id: 'turkey-wrap', dietaryTags: ['omnivore', 'high-protein'], goalKeys: ['eat'], prepTimeMin: 10, difficulty: 'easy', servings: 1, emoji: '🌯' },
];

/** Look up a recipe by id. */
export function recipeById(id: string): Recipe | undefined {
  return RECIPE_CATALOG.find((r) => r.id === id);
}

/**
 * Which recipes suit a chosen dietary profile. Compatibility is inclusive of
 * stricter diets (a vegetarian also enjoys vegan dishes; a pescatarian enjoys
 * vegetarian/vegan ones); gluten-free filters to gluten-free dishes; omnivore
 * sees everything.
 */
export function recipesForDiet(diet: DietaryTag): Recipe[] {
  const has = (r: Recipe, t: DietaryTag) => r.dietaryTags.includes(t);
  switch (diet) {
    case 'vegan':
      return RECIPE_CATALOG.filter((r) => has(r, 'vegan'));
    case 'vegetarian':
      return RECIPE_CATALOG.filter((r) => has(r, 'vegetarian') || has(r, 'vegan'));
    case 'pescatarian':
      return RECIPE_CATALOG.filter((r) => has(r, 'pescatarian') || has(r, 'vegetarian') || has(r, 'vegan'));
    case 'gluten-free':
      return RECIPE_CATALOG.filter((r) => has(r, 'gluten-free'));
    case 'omnivore':
      return [...RECIPE_CATALOG];
    default:
      return RECIPE_CATALOG.filter((r) => has(r, diet));
  }
}
