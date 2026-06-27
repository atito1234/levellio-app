/**
 * The user's personalized recipe collection: recipes recommended from their
 * dietary follow-up (settings.recommendedRecipeIds) plus anything they've saved.
 * Curated + offline — content comes from the `recipes` i18n namespace, metadata
 * from RECIPE_CATALOG. Saving / marking cooked is recorded via RecipesContext.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PressableScale, ScreenContainer } from '@/components';
import { colors, radii, spacing, typography } from '@/theme';
import { RECIPE_CATALOG, recipeById } from '@/data/recipes';
import { useRecipes } from '@/state/RecipesContext';
import { useSettings } from '@/state/SettingsContext';
import { dayKey } from '@/lib/dates';
import type { Recipe } from '@/types';

export function RecipesScreen() {
  const { t } = useTranslation('recipes');
  const { settings } = useSettings();
  const { saved, isSaved, save, markCooked } = useRecipes();
  const [expanded, setExpanded] = useState<string | null>(null);

  const recommended = useMemo<Recipe[]>(
    () => (settings.recommendedRecipeIds ?? []).map((id) => recipeById(id)).filter((r): r is Recipe => Boolean(r)),
    [settings.recommendedRecipeIds],
  );
  const savedRecipes = useMemo<Recipe[]>(
    () => saved.map((e) => recipeById(e.recipeId)).filter((r): r is Recipe => Boolean(r)),
    [saved],
  );
  // Saved recipes that aren't already in the recommended list (avoid duplicates).
  const recommendedIds = new Set(recommended.map((r) => r.id));
  const extraSaved = savedRecipes.filter((r) => !recommendedIds.has(r.id));

  const today = dayKey(new Date());
  const cookedToday = (id: string) => saved.find((e) => e.recipeId === id)?.cookedDates.includes(today) ?? false;

  const renderCard = (r: Recipe) => {
    const open = expanded === r.id;
    const ingredients = t(`${r.id}.ingredients`, { returnObjects: true, defaultValue: [] }) as string[];
    const steps = t(`${r.id}.steps`, { returnObjects: true, defaultValue: [] }) as string[];
    return (
      <View key={r.id} style={styles.card}>
        <Pressable onPress={() => setExpanded(open ? null : r.id)} accessibilityRole="button">
          <View style={styles.cardHead}>
            <Text style={styles.cardEmoji}>{r.emoji}</Text>
            <View style={styles.cardHeadText}>
              <Text style={styles.cardTitle}>{t(`${r.id}.title`, { defaultValue: r.id })}</Text>
              <Text style={styles.cardMeta}>{t('screen.meta', { minutes: r.prepTimeMin, servings: r.servings })}</Text>
            </View>
          </View>
          <Text style={styles.cardDesc}>{t(`${r.id}.desc`, { defaultValue: '' })}</Text>
          <Text style={styles.cardNutrition}>{t(`${r.id}.nutrition`, { defaultValue: '' })}</Text>
        </Pressable>

        {open && (
          <View style={styles.detail}>
            <Text style={styles.detailHead}>{t('screen.ingredients')}</Text>
            {ingredients.map((it, i) => (
              <Text key={`ing-${i}`} style={styles.detailLine}>• {it}</Text>
            ))}
            <Text style={[styles.detailHead, { marginTop: spacing.sm }]}>{t('screen.steps')}</Text>
            {steps.map((it, i) => (
              <Text key={`step-${i}`} style={styles.detailLine}>{i + 1}. {it}</Text>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          <PressableScale
            onPress={() => void save(r.id)}
            disabled={isSaved(r.id)}
            accessibilityRole="button"
            style={[styles.actionBtn, isSaved(r.id) && styles.actionBtnDone]}
          >
            <Text style={[styles.actionText, isSaved(r.id) && styles.actionTextDone]}>
              {isSaved(r.id) ? t('screen.savedLabel') : t('screen.save')}
            </Text>
          </PressableScale>
          <PressableScale
            onPress={() => void markCooked(r.id)}
            disabled={cookedToday(r.id)}
            accessibilityRole="button"
            style={[styles.actionBtn, styles.actionBtnPrimary, cookedToday(r.id) && styles.actionBtnDone]}
          >
            <Text style={[styles.actionText, styles.actionTextPrimary, cookedToday(r.id) && styles.actionTextDone]}>
              {cookedToday(r.id) ? t('screen.cookedToday') : t('screen.cook')}
            </Text>
          </PressableScale>
        </View>
      </View>
    );
  };

  const nothing = recommended.length === 0 && extraSaved.length === 0;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('screen.title')}</Text>
        <Text style={styles.subtitle}>{t('screen.subtitle')}</Text>

        {nothing && <Text style={styles.empty}>{t('screen.empty')}</Text>}

        {recommended.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('screen.recommended')}</Text>
            {recommended.map(renderCard)}
          </>
        )}

        {extraSaved.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('screen.saved')}</Text>
            {extraSaved.map(renderCard)}
          </>
        )}

        {/* Browse the rest of the catalog when the user has no matches yet. */}
        {nothing && RECIPE_CATALOG.map(renderCard)}
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

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs, borderWidth: 1, borderColor: colors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardEmoji: { fontSize: 30 },
  cardHeadText: { flex: 1 },
  cardTitle: { ...typography.title, color: colors.textPrimary },
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
