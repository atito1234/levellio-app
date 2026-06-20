import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

/**
 * BETA upgrade surface, fully localized. Monetization is OFF: `canInitiatePurchase()`
 * is false, so there is no purchase button and no charge can be initiated here. We
 * show an honest "Premium is coming soon — you're an early beta member" state and
 * never claim a feature that isn't live. Display copy lives in the `paywall` locale
 * namespace (honesty-scanned across all languages); the EN copy is kept in lockstep
 * with PLAN_CONFIG by paywallCopy.test.ts.
 */
export function PaywallScreen({ navigation }: Props) {
  const { t } = useTranslation('paywall');
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
        {/* Founding-member banner — everyone gets Plus free during the beta. */}
        <View style={styles.founding} accessibilityLabel={t('founding')}>
          <Text style={styles.foundingText}>{t('founding')}</Text>
        </View>

        {/* Levellio Plus — real perks; free for founding members (no charge path). */}
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
                <Text style={styles.star} accessibilityElementsHidden>
                  ✦
                </Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.impact}>{t('impact')}</Text>
        </View>

        {/* Free plan — what everyone always has */}
        <View style={styles.card} accessibilityLabel={t('freeCardTitle')}>
          <Text style={styles.planName}>{t('freeCardTitle')}</Text>
          <Text style={styles.tagline}>{t('freeTagline')}</Text>
          <View style={styles.features}>
            {freeFeatures.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Text style={styles.check} accessibilityElementsHidden>
                  ✓
                </Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sub}>{t('betaNotice')}</Text>
        <PrimaryButton label={t('closeLabel')} variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.lg },
  kicker: { ...typography.label, letterSpacing: 2, color: colors.violetDeep },
  heading: { ...typography.heading, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
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
});
