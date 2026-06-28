/**
 * The user's personalized recipe collection: recipes recommended from their
 * dietary follow-up (settings.recommendedRecipeIds), anything they've saved
 * (curated or AI-generated), and an on-demand "Generate with AI" action when a
 * cloud AI key is configured. Curated content comes from the `recipes` i18n
 * namespace; AI/custom content is stored inline. Saving / cooking is recorded
 * via RecipesContext.
 */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PressableScale, ScreenContainer } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { RECIPE_CATALOG, recipeById } from '@/data/recipes';
import { useRecipes } from '@/state/RecipesContext';
import { useSettings } from '@/state/SettingsContext';
import { useRecipeAi } from '@/hooks/useRecipeAi';
import { dayKey } from '@/lib/dates';
import type { Recipe, RecipeLogEntry } from '@/types';
import type { SuggestedRecipe } from '@/services/ai';

/** Normalized, render-ready recipe content (from catalog i18n or inline custom). */
interface CardContent {
  key: string;
  emoji: string;
  title: string;
  meta?: string;
  desc: string;
  nutrition?: string;
  ingredients: string[];
  steps: string[];
  ai?: boolean;
}

export function RecipesScreen() {
  const { t } = useTranslation('recipes');
  const { settings } = useSettings();
  const { saved, isSaved, save, saveCustom, markCooked } = useRecipes();
  const { available: aiAvailable, generate } = useRecipeAi();

  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<SuggestedRecipe[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const today = dayKey(new Date());
  const cookedToday = (id: string) => saved.find((e) => e.recipeId === id)?.cookedDates.includes(today) ?? false;

  const catalogContent = (r: Recipe): CardContent => ({
    key: r.id,
    emoji: r.emoji,
    title: t(`${r.id}.title`, { defaultValue: r.id }),
    meta: t('screen.meta', { minutes: r.prepTimeMin, servings: r.servings }),
    desc: t(`${r.id}.desc`, { defaultValue: '' }),
    nutrition: t(`${r.id}.nutrition`, { defaultValue: '' }),
    ingredients: t(`${r.id}.ingredients`, { returnObjects: true, defaultValue: [] }) as string[],
    steps: t(`${r.id}.steps`, { returnObjects: true, defaultValue: [] }) as string[],
  });

  const customContent = (entry: RecipeLogEntry): CardContent | null => {
    if (!entry.custom) return null;
    return {
      key: entry.recipeId,
      emoji: '✨',
      title: entry.custom.title,
      desc: entry.custom.description,
      ...(entry.custom.nutritionNote ? { nutrition: entry.custom.nutritionNote } : {}),
      ingredients: entry.custom.ingredients,
      steps: entry.custom.steps,
      ai: true,
    };
  };

  const suggestedContent = (r: SuggestedRecipe, i: number): CardContent => ({
    key: `gen-${i}-${r.title}`,
    emoji: '✨',
    title: r.title,
    desc: r.description,
    ...(r.nutritionNote ? { nutrition: r.nutritionNote } : {}),
    ingredients: r.ingredients,
    steps: r.steps,
    ai: true,
  });

  const recommended = useMemo<Recipe[]>(
    () => (settings.recommendedRecipeIds ?? []).map((id) => recipeById(id)).filter((r): r is Recipe => Boolean(r)),
    [settings.recommendedRecipeIds],
  );
  const recommendedIds = new Set(recommended.map((r) => r.id));
  const savedCatalog = saved
    .filter((e) => !e.custom && !recommendedIds.has(e.recipeId))
    .map((e) => recipeById(e.recipeId))
    .filter((r): r is Recipe => Boolean(r));
  const savedCustom = saved.map(customContent).filter((c): c is CardContent => Boolean(c));
  const savedCustomTitles = new Set(savedCustom.map((c) => c.title));

  const dietary = settings.onboardingAnswers?.dietaryTag;

  const runGenerate = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    setAiMsg(null);
    const results = await generate(dietary);
    setAiBusy(false);
    if (results.length === 0) {
      setAiMsg(t('screen.aiUnavailable'));
      return;
    }
    setAiResults(results);
  };

  const renderCard = (c: CardContent, footer: React.ReactNode) => {
    const open = expanded === c.key;
    return (
      <View key={c.key} style={styles.card}>
        <Pressable onPress={() => setExpanded(open ? null : c.key)} accessibilityRole="button">
          <View style={styles.cardHead}>
            <Text style={styles.cardEmoji}>{c.emoji}</Text>
            <View style={styles.cardHeadText}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                {c.ai && <Text style={styles.aiBadge}>{t('screen.aiBadge')}</Text>}
              </View>
              {c.meta ? <Text style={styles.cardMeta}>{c.meta}</Text> : null}
            </View>
          </View>
          {c.desc ? <Text style={styles.cardDesc}>{c.desc}</Text> : null}
          {c.nutrition ? <Text style={styles.cardNutrition}>{c.nutrition}</Text> : null}
        </Pressable>

        {open && (
          <View style={styles.detail}>
            <Text style={styles.detailHead}>{t('screen.ingredients')}</Text>
            {c.ingredients.map((it, i) => (
              <Text key={`ing-${i}`} style={styles.detailLine}>• {it}</Text>
            ))}
            <Text style={[styles.detailHead, { marginTop: spacing.sm }]}>{t('screen.steps')}</Text>
            {c.steps.map((it, i) => (
              <Text key={`step-${i}`} style={styles.detailLine}>{i + 1}. {it}</Text>
            ))}
          </View>
        )}

        <View style={styles.actions}>{footer}</View>
      </View>
    );
  };

  const saveBtn = (id: string) => (
    <PressableScale
      onPress={() => void save(id)}
      disabled={isSaved(id)}
      accessibilityRole="button"
      style={[styles.actionBtn, isSaved(id) && styles.actionBtnDone]}
    >
      <Text style={[styles.actionText, isSaved(id) && styles.actionTextDone]}>
        {isSaved(id) ? t('screen.savedLabel') : t('screen.save')}
      </Text>
    </PressableScale>
  );

  const cookBtn = (id: string) => (
    <PressableScale
      onPress={() => void markCooked(id)}
      disabled={cookedToday(id)}
      accessibilityRole="button"
      style={[styles.actionBtn, styles.actionBtnPrimary, cookedToday(id) && styles.actionBtnDone]}
    >
      <Text style={[styles.actionText, styles.actionTextPrimary, cookedToday(id) && styles.actionTextDone]}>
        {cookedToday(id) ? t('screen.cookedToday') : t('screen.cook')}
      </Text>
    </PressableScale>
  );

  const nothing = recommended.length === 0 && savedCatalog.length === 0 && savedCustom.length === 0;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('screen.title')}</Text>
        <Text style={styles.subtitle}>{t('screen.subtitle')}</Text>

        {aiAvailable && (
          <PressableScale onPress={() => void runGenerate()} disabled={aiBusy} accessibilityRole="button" style={styles.generateBtn}>
            {aiBusy ? (
              <ActivityIndicator color={colors.violetDeep} />
            ) : (
              <Text style={styles.generateText}>{t('screen.generate')}</Text>
            )}
          </PressableScale>
        )}
        {aiMsg ? <Text style={styles.empty}>{aiMsg}</Text> : null}

        {aiResults.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('screen.generated')}</Text>
            {aiResults.map((r, i) => {
              const c = suggestedContent(r, i);
              const already = savedCustomTitles.has(r.title);
              return renderCard(
                c,
                <PressableScale
                  onPress={() => void saveCustom(r)}
                  disabled={already}
                  accessibilityRole="button"
                  style={[styles.actionBtn, styles.actionBtnPrimary, already && styles.actionBtnDone]}
                >
                  <Text style={[styles.actionText, styles.actionTextPrimary, already && styles.actionTextDone]}>
                    {already ? t('screen.savedLabel') : t('screen.save')}
                  </Text>
                </PressableScale>,
              );
            })}
          </>
        )}

        {nothing && aiResults.length === 0 && <Text style={styles.empty}>{t('screen.empty')}</Text>}

        {recommended.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('screen.recommended')}</Text>
            {recommended.map((r) => renderCard(catalogContent(r), <>{saveBtn(r.id)}{cookBtn(r.id)}</>))}
          </>
        )}

        {(savedCatalog.length > 0 || savedCustom.length > 0) && (
          <>
            <Text style={styles.sectionLabel}>{t('screen.saved')}</Text>
            {savedCatalog.map((r) => renderCard(catalogContent(r), <>{saveBtn(r.id)}{cookBtn(r.id)}</>))}
            {savedCustom.map((c) => renderCard(c, cookBtn(c.key)))}
          </>
        )}

        {/* Browse the rest of the catalog when the user has no matches yet. */}
        {nothing && aiResults.length === 0 && RECIPE_CATALOG.map((r) => renderCard(catalogContent(r), <>{saveBtn(r.id)}{cookBtn(r.id)}</>))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingVertical: spacing.lg, paddingBottom: spacing.xl },
  title: { ...typography.heading, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, marginVertical: spacing.md },
  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1, marginTop: spacing.md },

  generateBtn: { alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingVertical: spacing.md, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.identity, backgroundColor: colors.violetSoft, marginVertical: spacing.xs },
  generateText: { ...typography.label, color: colors.violetDeep, fontWeight: '800' },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardEmoji: { fontSize: 30 },
  cardHeadText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.title, color: colors.textPrimary, flexShrink: 1 },
  aiBadge: { ...typography.caption, color: colors.violetDeep, fontWeight: '800', backgroundColor: colors.violetSoft, paddingHorizontal: 6, paddingVertical: 1, borderRadius: radii.pill, overflow: 'hidden' },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  cardDesc: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  cardNutrition: { ...typography.caption, color: colors.violetDeep, marginTop: spacing.xs },

  detail: { marginTop: spacing.sm, gap: 2 },
  detailHead: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },
  detailLine: { ...typography.body, color: colors.textPrimary },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  actionBtnPrimary: { backgroundColor: colors.violetSoft, borderColor: colors.identity },
  actionBtnDone: { opacity: 0.6 },
  actionText: { ...typography.label, color: colors.textPrimary, fontWeight: '700' },
  actionTextPrimary: { color: colors.violetDeep },
  actionTextDone: { color: colors.textMuted },
});
