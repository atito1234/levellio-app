/**
 * AchievementUnlockedModal — shows the dark certificate for an earned achievement,
 * the "How you did it" analytics evidence (real stats + a chart) and a takeaway
 * lesson, then Share (text now) / Download (image gated for the EAS dev build).
 */
import React, { useMemo } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkline } from '@/components/charts/Sparkline';
import { AchievementCertificate } from '@/components/AchievementCertificate';
import { spacing, typography } from '@/theme';
import { CERTIFICATE_IMAGE_ENABLED } from '@/config/features';
import type { AchievementState, AchievementEvidenceCtx } from '@/lib/achievements';

const NAVY = '#0E1424';
const PANEL = '#16203A';
const SKY = '#7FB2FF';
const INK_ON_DARK = '#F4F7FF';
const MUTED_ON_DARK = '#93A4C4';
const TEAL = '#16C8A8';
const TRACK = '#2A3550';

export function AchievementUnlockedModal({
  state,
  ctx,
  name,
  onClose,
}: {
  state: AchievementState | null;
  ctx: AchievementEvidenceCtx;
  name: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation('achievements');
  const visible = state !== null;
  const id = state?.def.id;

  const evidence = useMemo(() => (state ? state.def.evidence(ctx) : null), [state, ctx]);
  if (!state || !id || !evidence) {
    return <Modal visible={false} transparent />;
  }

  const title = t('items.' + id + '.title');
  const desc = t('items.' + id + '.desc');
  const takeaway = t('items.' + id + '.takeaway', { defaultValue: '' });
  const dateLabel = new Date().toLocaleDateString(i18n.language, { year: 'numeric', month: 'short', day: 'numeric' });
  const headlineStr = evidence.headline.map((s) => `${s.value} ${t(s.labelKey)}`).join(' · ');

  const onShare = () => {
    void Share.share({ message: t('shareText', { title, headline: headlineStr }) });
  };
  const onDownload = () => {
    if (!CERTIFICATE_IMAGE_ENABLED) {
      Alert.alert(t('cert.downloadSoonTitle'), t('cert.downloadSoonBody'));
      return;
    }
    // EAS dev build: capture the certificate ref → expo-media-library / expo-sharing.
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('cert.close')} style={styles.close} hitSlop={10}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <AchievementCertificate
              emoji={state.def.emoji}
              title={title}
              description={desc}
              headline={evidence.headline}
              name={name}
              dateLabel={dateLabel}
            />

            {/* How you did it — real analytics evidence. */}
            <Text style={styles.evidenceLabel}>{t('cert.howYouDidIt')}</Text>
            <View style={styles.panel}>
              {evidence.detail.map((s, i) => (
                <View key={i} style={styles.row}>
                  <Text style={styles.rowLabel}>{t(s.labelKey)}</Text>
                  <Text style={styles.rowValue}>{s.value}</Text>
                </View>
              ))}
              {evidence.chart?.kind === 'spark' && (
                <Sparkline values={evidence.chart.data as number[]} height={64} color={SKY} />
              )}
              {evidence.chart?.kind === 'week' && (
                <View style={styles.week}>
                  {(evidence.chart.data as boolean[]).map((done, i) => (
                    <View key={i} style={[styles.weekDot, done ? styles.weekDotOn : styles.weekDotOff]} />
                  ))}
                </View>
              )}
            </View>
            {takeaway.length > 0 && <Text style={styles.takeaway}>💡 {takeaway}</Text>}

            <View style={styles.actions}>
              <Pressable onPress={onShare} accessibilityRole="button" style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>{t('cert.share')}</Text>
              </Pressable>
              <Pressable onPress={onDownload} accessibilityRole="button" style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnGhostText}>{t('cert.download')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,10,20,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: NAVY, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', paddingTop: spacing.md },
  close: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 2, width: 32, height: 32, borderRadius: 999, backgroundColor: PANEL, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: MUTED_ON_DARK, fontWeight: '900' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  evidenceLabel: { ...typography.label, color: SKY, letterSpacing: 2, fontWeight: '800', marginTop: spacing.sm },
  panel: { backgroundColor: PANEL, borderRadius: 16, padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { ...typography.body, color: MUTED_ON_DARK },
  rowValue: { ...typography.body, color: INK_ON_DARK, fontWeight: '800' },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  weekDot: { width: 22, height: 22, borderRadius: 999 },
  weekDotOn: { backgroundColor: TEAL },
  weekDotOff: { backgroundColor: TRACK },
  takeaway: { ...typography.body, color: INK_ON_DARK, backgroundColor: PANEL, borderRadius: 14, padding: spacing.md },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  btn: { flex: 1, borderRadius: 999, paddingVertical: spacing.md, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#2F6BFF' },
  btnPrimaryText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  btnGhost: { borderWidth: 1, borderColor: '#2F6BFF' },
  btnGhostText: { ...typography.label, color: SKY, fontWeight: '800' },
});
