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
import type { ProjectApplication, Report } from '@/lib/moderation';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminModeration'>;

export function AdminModerationScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation(['feed', 'projects', 'common']);
  const { isModerator, subscribeReports, resolveReport, banUser, removeContent, subscribeApplications, setApplicationStatus } = useCommunity();
  const [reports, setReports] = useState<Report[]>([]);
  const [applications, setApplications] = useState<ProjectApplication[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isModerator) return;
    const unsubR = subscribeReports(setReports);
    const unsubA = subscribeApplications(setApplications);
    return () => {
      unsubR();
      unsubA();
    };
  }, [isModerator, subscribeReports, subscribeApplications]);

  const decideApp = async (app: ProjectApplication, status: 'approved' | 'rejected') => {
    setBusy(app.id);
    try {
      await setApplicationStatus(app.id, status);
    } finally {
      setBusy(null);
    }
  };

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
        {applications.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>{t('projects:application.consoleTitle')}</Text>
            {applications.map((a) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.kind}>{t(`projects:application.visibility_${a.visibility}`)}</Text>
                  <Text style={styles.time}>{relTime(a.createdAt, t, i18n.language)}</Text>
                </View>
                <Text style={styles.appTitle}>{a.title}</Text>
                <Text style={styles.preview} numberOfLines={3}>{a.region} — {a.summary}</Text>
                {a.why ? <Text style={styles.reason}>{t('projects:application.whyLabel')}: {a.why}</Text> : null}
                <Text style={styles.reason}>{t('projects:application.by', { name: a.applicantName })}</Text>
                <View style={styles.actions}>
                  <Pressable disabled={busy === a.id} onPress={() => void decideApp(a, 'approved')} accessibilityRole="button" style={[styles.btn, styles.btnRemove]}>
                    <Text style={styles.btnRemoveText}>{t('projects:application.approve')}</Text>
                  </Pressable>
                  <Pressable disabled={busy === a.id} onPress={() => void decideApp(a, 'rejected')} accessibilityRole="button" style={[styles.btn, styles.btnDismiss]}>
                    <Text style={styles.btnDismissText}>{t('projects:application.reject')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Text style={styles.sectionLabel}>{t('feed:console.reportsSection')}</Text>
          </>
        )}
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
  sectionLabel: { ...typography.label, color: colors.textSecondary, letterSpacing: 1, fontWeight: '800', marginTop: spacing.sm },
  appTitle: { ...typography.title, color: colors.textPrimary, fontWeight: '800' },
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
