/**
 * Gates and runs AI recipe generation. Available only when the user opted in
 * (settings.aiRecipesEnabled), is on a cloud engine, and has a key configured.
 * `generate` builds the active engine and calls the resilient generateRecipes,
 * which never throws (returns [] when unavailable) — the curated catalog is the
 * UI-level fallback.
 */
import { useCallback, useEffect, useState } from 'react';
import i18n from '@/i18n';
import { useSettings } from '@/state/SettingsContext';
import { buildEngine, generateRecipes, type SuggestedRecipe } from '@/services/ai';
import { getByoApiKey } from '@/services/security/secureKeyStore';

export function useRecipeAi() {
  const { settings } = useSettings();
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    let active = true;
    if (settings.aiMode !== 'cloud') {
      setHasKey(false);
      return;
    }
    getByoApiKey().then((key) => {
      if (active) setHasKey(Boolean(key));
    });
    return () => {
      active = false;
    };
  }, [settings.aiMode]);

  const available = settings.aiRecipesEnabled && settings.aiMode === 'cloud' && hasKey;

  const generate = useCallback(
    async (dietary?: string, count = 3): Promise<SuggestedRecipe[]> => {
      const engine = buildEngine(settings, { getApiKey: () => getByoApiKey() });
      const { recipes } = await generateRecipes(engine, {
        ...(dietary ? { dietary } : {}),
        count,
        language: i18n.language,
      });
      return recipes;
    },
    [settings],
  );

  return { available, generate };
}
