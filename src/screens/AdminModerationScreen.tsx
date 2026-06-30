/**
 * Owner moderation console — the 24-hour action surface required by Apple 1.2 /
 * Google UGC. Lists OPEN reports (live) and lets a moderator remove the reported
 * content and/or ban the user, or dismiss the report. Visible only to moderators
 * (an `admins/{uid}` doc exists). Minimal, fast, glanceable.
 */
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useCommunity } from '@/state/CommunityContext';
import { relTime } from '@/lib/relTime';
import type { Report } from '@/lib/moderation';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminModeration'>;

export function AdminModerationScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation(['feed', 'common']);
  const { isModerator, subscribeReports, resolveReport, banUser, removeContent } = useCommunity();
  const [reports, setReports] = useState<Report[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isModerator) return;
    return subscribeReports(setReports);
  }, [isModerator, subscribeReports]);

  const act = async (r: Report, fn: () => Promise<void>) => {
    setBusy(r.reportId);
    try {
      await fn();
      await resolveReport(r.reportId);
    } finally {
      setBusy(null);
    }
  };

  const onRemove = (r: Report) => void act(r, async () => { await removeContent(r); Alert.alert(t('feed:console.removedAck')); });
  const onDismiss = (r: Report) => void act(r, async () => {});
  const onBan = (r: Report) =>
    Alert.alert(t('feed:console.banConfirmTitle'), t('feed:console.banConfirmBody'), [
      { text: t('common:action.cancel'), style: 'cancel' },
      {
        text: t('feed:console.ban'),
        style: 'destructive',
        onPress: () => void act(r, async () => { await banUser(r.targetUid); await removeContent(r); Alert.alert(t('feed:console.bannedAck')); }),
      },
    ]);

  return (
    <ScreenContainer>
      <ScreenHeader title={t('feed:console.title')} onBack={() => navigation.goBack()} backLabel={t('common:action.back')} />
      <Text style={styles.subtitle}>{t('feed:console.subtitle')}</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {reports.length === 0 ? (
          <Text style={styles.empty}>{t('feed:console.empty')}</Text>
        ) : (
          reports.map((r) => (
            <View key={r.reportId} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.kind}>{r.type.toUpperCase()}</Text>
                <Text style={styles.time}>{relTime(r.createdAt, t, i18n.language)}</Text>
              </View>
              {r.preview ? <Text style={styles.preview} numberOfLines={4}>{r.preview}</Text> : null}
              <Text style={styles.reason}>
                {t('feed:console.reasonLabel')}: {t(`feed:report.reason_${r.reason}`)}
              </Text>
              <View style={styles.actions}>
                {r.type !== 'user' && (
                  <Pressable disabled={busy === r.reportId} onPress={() => onRemove(r)} accessibilityRole="button" style={[styles.btn, styles.btnRemove]}>
                    <Text style={styles.btnRemoveText}>{t('feed:console.remove')}</Text>
                  </Pressable>
                )}
                <Pressable disabled={busy === r.reportId} onPress={() => onBan(r)} accessibilityRole="button" style={[styles.btn, styles.btnBan]}>
                  <Text style={styles.btnBanText}>{t('feed:console.ban')}</Text>
                </Pressable>
                <Pressable disabled={busy === r.reportId} onPress={() => onDismiss(r)} accessibilityRole="button" style={[styles.btn, styles.btnDismiss]}>
                  <Text style={styles.btnDismissText}>{t('feed:console.dismiss')}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.caption, color: colors.textSecondary, paddingBottom: spacing.sm },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingTop: spacing.xxl },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kind: { ...typography.caption, color: colors.violetDeep, fontWeight: '900', letterSpacing: 1 },
  time: { ...typography.caption, color: colors.textMuted },
  preview: { ...typography.body, color: colors.textPrimary, backgroundColor: colors.background, borderRadius: radii.md, padding: spacing.sm },
  reason: { ...typography.caption, color: colors.textSecondary, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  btn: { borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  btnRemove: { backgroundColor: colors.identity },
  btnRemoveText: { ...typography.label, color: '#FFFFFF', fontWeight: '800' },
  btnBan: { backgroundColor: '#FCE3EE', borderWidth: 1, borderColor: '#D9457E' },
  btnBanText: { ...typography.label, color: '#B21E5B', fontWeight: '800' },
  btnDismiss: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  btnDismissText: { ...typography.label, color: colors.textSecondary, fontWeight: '700' },
});
