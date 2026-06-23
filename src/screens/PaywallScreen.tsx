import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnimatedHero, PressableScale, PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { isMonetizationLive, PLUS_SKUS, type PlusSku } from '@/services/monetization';
import { getSubscriptionService } from '@/services/subscription';
import { useGame } from '@/state/GameContext';
import { useSettings } from '@/state/SettingsContext';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

/**
 * Upgrade surface. Two states, one switch:
 *  - `isMonetizationLive()` false (today): the honest founding-member/beta surface —
 *    nothing to buy, no charge path. Kept in lockstep with PLAN_CONFIG (paywallCopy.test).
 *  - live (at go-live, behind real billing): the "Claim Plus" experience — plan
 *    selector, 7-day free trial, transparent terms, restore, mission.
 * Copy lives in the honesty-scanned `paywall` namespace.
 */
export function PaywallScreen({ navigation }: Props) {
  const { t } = useTranslation('paywall');
  if (isMonetizationLive()) return <LivePaywall navigation={navigation} t={t} />;
  return <BetaPaywall navigation={navigation} t={t} />;
}

// --- Live (paid) surface — shown once billing is configured ------------------

function LivePaywall({ navigation, t }: { navigation: Props['navigation']; t: ReturnType<typeof useTranslation>['t'] }) {
  const { character } = useGame();
  const plusFeatures = t('plusFeatures', { returnObjects: true }) as unknown as string[];
  const [sku, setSku] = useState<PlusSku>(PLUS_SKUS.find((s) => s.bestValue) ?? PLUS_SKUS[0]!);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isLifetime = sku.period === 'lifetime';

  const buy = async () => {
    setBusy(true);
    setNotice(null);
    const res = await getSubscriptionService().purchase('premium');
    setBusy(false);
    if (res.ok) navigation.goBack();
    else setNotice(t('live.unavailable')); // honest: nothing charged yet
  };

  const restore = async () => {
    setBusy(true);
    const res = await getSubscriptionService().restore();
    setBusy(false);
    if (res.ok) navigation.goBack();
    else setNotice(t('live.unavailable'));
  };

  return (
    <ScreenContainer>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('closeLabel')} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroStage}>
          <View style={styles.heroHalo} />
          <AnimatedHero presentation={character?.presentation ?? 'neutral'} tier="luminary" size={104} />
        </View>
        <Text style={styles.kicker}>{t('live.kicker')}</Text>
        <Text style={styles.heading}>{t('live.heading')}</Text>
        <Text style={styles.sub}>{t('live.sub')}</Text>

        {/* Plan selector */}
        <View style={styles.skuRow}>
          {PLUS_SKUS.map((s) => {
            const on = s.id === sku.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSku(s)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.sku, on && styles.skuOn]}
              >
                {s.bestValue && <Text style={styles.badge}>{t('live.bestValue')}</Text>}
                <Text style={[styles.skuPeriod, on && styles.skuPeriodOn]}>{t(`live.period.${s.period}`)}</Text>
                <Text style={[styles.skuPrice, on && styles.skuPriceOn]}>{s.priceLabel}</Text>
                {s.subLabel ? <Text style={styles.skuSub}>{s.subLabel}</Text> : null}
              </Pressable>
            );
          })}
        </View>

        <PressableScale onPress={() => void buy()} disabled={busy} accessibilityRole="button" style={styles.cta}>
          <Text style={styles.ctaText}>{isLifetime ? t('live.lifetimeCta') : t('live.trialCta')}</Text>
        </PressableScale>
        <Text style={styles.terms}>
          {isLifetime ? t('live.lifetimeThen', { price: sku.priceLabel }) : t('live.trialThen', { price: sku.priceLabel })}
        </Text>
        <Text style={styles.terms}>{t('live.cancelAnytime')}</Text>
        {notice && <Text style={styles.notice}>{notice}</Text>}

        {/* What's included */}
        <View style={[styles.card, styles.plusCard]}>
          <Text style={styles.planName}>{t('live.includedTitle')}</Text>
          <View style={styles.features}>
            {plusFeatures.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.star} accessibilityElementsHidden>✦</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.impact}>{t('impact')}</Text>
        </View>

        <Pressable onPress={() => void restore()} accessibilityRole="button" style={styles.restore} hitSlop={8}>
          <Text style={styles.restoreText}>{t('live.restore')}</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

// --- Beta (free) surface — honest "coming soon", no charge path --------------

function BetaPaywall({ navigation, t }: { navigation: Props['navigation']; t: ReturnType<typeof useTranslation>['t'] }) {
  const { update } = useSettings();
  const freeFeatures = t('freeFeatures', { returnObjects: true }) as unknown as string[];
  const plusFeatures = t('plusFeatures', { returnObjects: true }) as unknown as string[];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t('kicker')}</Text>
        <Text style={styles.heading}>{t('plusTitle')}</Text>
        <Text style={styles.sub}>{t('disclosure')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.founding} accessibilityLabel={t('founding')}>
          <Text style={styles.foundingText}>{t('founding')}</Text>
        </View>

        <View style={[styles.card, styles.plusCard]}>
          <View style={styles.cardHead}>
            <Text style={styles.planName}>{t('plusTitle')}</Text>
            <View style={styles.pricePill}>
              <Text style={styles.priceFree}>{t('priceFree')}</Text>
            </View>
          </View>
          <Text style={styles.priceFuture}>{t('priceFuture')}</Text>
          <View style={styles.features}>
            {plusFeatures.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Text style={styles.star} accessibilityElementsHidden>✦</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.impact}>{t('impact')}</Text>
        </View>

        <View style={styles.card} accessibilityLabel={t('freeCardTitle')}>
          <Text style={styles.planName}>{t('freeCardTitle')}</Text>
          <Text style={styles.tagline}>{t('freeTagline')}</Text>
          <View style={styles.features}>
            {freeFeatures.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Text style={styles.check} accessibilityElementsHidden>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sub}>{t('betaNotice')}</Text>
        <PrimaryButton label={t('closeLabel')} variant="ghost" onPress={() => navigation.goBack()} />

        {/* Dev-only: preview the Plus-gated features without billing. */}
        {__DEV__ && (
          <Pressable onPress={() => void update({ isPremium: true })} accessibilityRole="button" style={styles.devPreview} hitSlop={8}>
            <Text style={styles.devPreviewText}>{t('devPreview')}</Text>
          </Pressable>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.lg },
  topbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: spacing.sm },
  close: { ...typography.title, color: colors.textSecondary },
  kicker: { ...typography.label, letterSpacing: 2, color: colors.violetDeep },
  heading: { ...typography.heading, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },

  heroStage: { alignSelf: 'center', width: 140, height: 140, borderRadius: radii.xl, backgroundColor: colors.violetDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...shadows.lg },
  heroHalo: { position: 'absolute', width: 108, height: 108, borderRadius: radii.round, backgroundColor: colors.identity, opacity: 0.5 },

  skuRow: { flexDirection: 'row', gap: spacing.sm },
  sku: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.md, gap: 2, alignItems: 'center', backgroundColor: colors.surface },
  skuOn: { borderColor: colors.identity, backgroundColor: colors.violetSoft },
  badge: { ...typography.caption, fontSize: 9, fontWeight: '800', color: colors.identity, letterSpacing: 1 },
  skuPeriod: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  skuPeriodOn: { color: colors.violetDeep },
  skuPrice: { ...typography.label, color: colors.textPrimary, fontWeight: '800' },
  skuPriceOn: { color: colors.violetDeep },
  skuSub: { ...typography.caption, color: colors.textMuted, fontSize: 10, textAlign: 'center' },

  cta: { backgroundColor: colors.identity, borderRadius: radii.pill, paddingVertical: spacing.md, alignItems: 'center' },
  ctaText: { ...typography.title, color: '#FFFFFF', fontWeight: '800' },
  terms: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  notice: { ...typography.body, color: colors.violetDeep, textAlign: 'center', backgroundColor: colors.violetSoft, borderRadius: radii.md, padding: spacing.md },
  restore: { alignItems: 'center', paddingVertical: spacing.sm },
  restoreText: { ...typography.label, color: colors.identity, fontWeight: '700' },

  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm, ...shadows.sm },
  plusCard: { borderColor: colors.identity, borderWidth: 2 },
  founding: { backgroundColor: colors.violetSoft, borderRadius: radii.lg, padding: spacing.md },
  foundingText: { ...typography.label, color: colors.violetDeep, fontWeight: '800', textAlign: 'center' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { ...typography.title, color: colors.textPrimary },
  pricePill: { backgroundColor: colors.violetSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  priceFree: { ...typography.caption, fontWeight: '800', color: colors.violetDeep },
  priceFuture: { ...typography.caption, color: colors.textMuted },
  tagline: { ...typography.body, color: colors.textSecondary },
  impact: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },
  features: { gap: spacing.sm, marginTop: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  check: { ...typography.label, color: colors.tealDeep },
  star: { ...typography.label, color: colors.identity },
  featureText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  devPreview: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, borderStyle: 'dashed' },
  devPreviewText: { ...typography.caption, color: colors.textMuted, fontWeight: '700' },
});
