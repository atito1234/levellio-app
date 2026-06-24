/**
 * Levellio Plus plan selector — the single source of truth for the upgrade offer,
 * reused by the standalone PaywallScreen (live) and the onboarding priming step.
 * Trial is anchored on the yearly plan only (max LTV); monthly/lifetime are buy-now.
 * Honest terms: shows exactly what's charged + "cancel anytime"; on a no-billing
 * build the purchase resolves to an honest "almost ready" notice.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radii, spacing, typography } from '@/theme';
import { PLUS_SKUS, type PlusSku } from '@/services/monetization';
import { useSubscription } from '@/state/SubscriptionContext';
import { PressableScale } from './PressableScale';

export function PlusPlans({ onPurchased }: { onPurchased: () => void }) {
  const { t } = useTranslation('paywall');
  const { purchase, restore } = useSubscription();
  const [sku, setSku] = useState<PlusSku>(PLUS_SKUS.find((s) => s.bestValue) ?? PLUS_SKUS[0]!);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const ctaLabel = sku.trial
    ? t('live.trialCta')
    : sku.period === 'lifetime'
      ? t('live.lifetimeCta')
      : t('live.subscribeCta', { price: sku.priceLabel });

  const termsLabel = sku.trial
    ? t('live.trialThen', { price: sku.priceLabel })
    : sku.period === 'lifetime'
      ? t('live.lifetimeThen', { price: sku.priceLabel })
      : t('live.monthlyThen', { price: sku.priceLabel });

  const buy = async () => {
    setBusy(true);
    setNotice(null);
    const res = await purchase(sku.id);
    setBusy(false);
    if (res.ok) onPurchased();
    else if (res.reason !== 'cancelled') setNotice(t('live.unavailable'));
  };

  const onRestore = async () => {
    setBusy(true);
    const res = await restore();
    setBusy(false);
    if (res.ok) onPurchased();
    else setNotice(t('live.unavailable'));
  };

  return (
    <View style={styles.wrap}>
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
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </PressableScale>
      <Text style={styles.terms}>{termsLabel}</Text>
      <Text style={styles.terms}>{t('live.cancelAnytime')}</Text>
      {notice && <Text style={styles.notice}>{notice}</Text>}

      <Pressable onPress={() => void onRestore()} accessibilityRole="button" style={styles.restore} hitSlop={8}>
        <Text style={styles.restoreText}>{t('live.restore')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
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
});
