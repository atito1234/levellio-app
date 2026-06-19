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

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t('kicker')}</Text>
        <Text style={styles.heading}>{t('heading')}</Text>
        <Text style={styles.sub}>{t('disclosure')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Free plan — what everyone has today */}
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

        {/* Premium — honest "coming soon", no purchase path */}
        <View style={[styles.card, styles.comingSoon]} accessibilityLabel={t('comingSoonTitle')}>
          <View style={styles.cardHead}>
            <Text style={styles.planName}>{t('comingSoonTitle')}</Text>
            <View style={styles.soonPill}>
              <Text style={styles.soonText}>{t('comingSoonBadge')}</Text>
            </View>
          </View>
          <Text style={styles.tagline}>{t('betaNotice')}</Text>
        </View>

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
  comingSoon: { borderStyle: 'dashed', borderColor: colors.violetMuted },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { ...typography.title, color: colors.textPrimary },
  soonPill: {
    backgroundColor: colors.violetSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  soonText: { ...typography.caption, fontWeight: '700', color: colors.violetDeep },
  tagline: { ...typography.body, color: colors.textSecondary },
  features: { gap: spacing.sm, marginTop: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  check: { ...typography.label, color: colors.tealDeep },
  featureText: { ...typography.body, color: colors.textPrimary, flex: 1 },
});
