import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useSettings } from '@/state/SettingsContext';
import { PLAN_CONFIG, type PlanConfig } from '@/services/monetization';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

/** Honest free-vs-premium surface. No real billing — the CTA is a demo toggle. */
export function PaywallScreen({ navigation }: Props) {
  const { settings, update } = useSettings();
  const isPremium = settings.isPremium;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.kicker}>LEVELLIO PREMIUM</Text>
        <Text style={styles.heading}>Optional delight, never required</Text>
        <Text style={styles.sub}>{PLAN_CONFIG.disclosure}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {PLAN_CONFIG.plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} active={plan.id === 'premium' && isPremium} />
        ))}

        <Text style={styles.demoNote} accessibilityLabel="Demo notice">
          Demo build: no real purchase. The button below simply toggles premium so you can preview
          gated features.
        </Text>

        {isPremium ? (
          <PrimaryButton
            label="Switch back to Free (demo)"
            variant="ghost"
            onPress={() => update({ isPremium: false })}
          />
        ) : (
          <PrimaryButton
            label="Unlock Premium (demo)"
            variant="reward"
            onPress={() => update({ isPremium: true })}
          />
        )}
        <PrimaryButton label="Close" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </ScreenContainer>
  );
}

function PlanCard({ plan, active }: { plan: PlanConfig; active: boolean }) {
  return (
    <View
      style={[styles.card, plan.highlighted && styles.cardPremium]}
      accessibilityLabel={`${plan.name} plan, ${plan.price.label}`}
    >
      <View style={styles.cardHead}>
        <Text style={styles.planName}>{plan.name}</Text>
        {active && (
          <View style={styles.activePill}>
            <Text style={styles.activeText}>ACTIVE ✨</Text>
          </View>
        )}
      </View>
      <Text style={styles.price}>{plan.price.label}</Text>
      <Text style={styles.tagline}>{plan.tagline}</Text>
      <View style={styles.features}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Text style={styles.check} accessibilityElementsHidden>
              ✓
            </Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  kicker: {
    ...typography.label,
    letterSpacing: 2,
    color: colors.violetDeep,
  },
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  sub: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  cardPremium: {
    borderColor: colors.gold,
    borderWidth: 2,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    ...typography.title,
    color: colors.textPrimary,
  },
  activePill: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  activeText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.goldDeep,
  },
  price: {
    ...typography.title,
    color: colors.violetDeep,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
  },
  features: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  check: {
    ...typography.label,
    color: colors.tealDeep,
  },
  featureText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  demoNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
