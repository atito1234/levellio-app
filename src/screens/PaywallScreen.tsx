import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { getPlan } from '@/services/monetization';
import { PAYWALL_COPY } from '@/content/uiCopy';
import { PLAN_CONFIG } from '@/services/monetization';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

/**
 * v1.0 BETA upgrade surface. Monetization is OFF: there is no purchase button,
 * no toggle, and no charge can be initiated here. We show an honest "Premium is
 * coming soon — you're an early beta member" state and never claim a feature
 * that isn't live. The component is kept intact for reactivation in v1.5.
 */
export function PaywallScreen({ navigation }: Props) {
  const free = getPlan('free');

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.kicker}>{PAYWALL_COPY.kicker}</Text>
        <Text style={styles.heading}>{PAYWALL_COPY.heading}</Text>
        <Text style={styles.sub}>{PLAN_CONFIG.disclosure}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Free plan — what everyone has today */}
        <View style={styles.card} accessibilityLabel="Your current plan: Free">
          <Text style={styles.planName}>{PAYWALL_COPY.freeCardTitle}</Text>
          <Text style={styles.tagline}>{free.tagline}</Text>
          <View style={styles.features}>
            {free.features.map((feature) => (
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
        <View
          style={[styles.card, styles.comingSoon]}
          accessibilityLabel="Premium is coming soon. No purchase is available."
        >
          <View style={styles.cardHead}>
            <Text style={styles.planName}>{PAYWALL_COPY.comingSoonTitle}</Text>
            <View style={styles.soonPill}>
              <Text style={styles.soonText}>COMING SOON</Text>
            </View>
          </View>
          <Text style={styles.tagline}>{PLAN_CONFIG.betaNotice}</Text>
        </View>

        <PrimaryButton label={PAYWALL_COPY.closeLabel} variant="ghost" onPress={() => navigation.goBack()} />
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
