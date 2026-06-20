import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer } from '@/components';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AISetup'>;

const GALLERY_URL = 'https://ai.google.dev/edge';

/** Honest, friendly explainer of Levellio's AI options + how to run a model on-device. */
export function AISetupScreen({ navigation }: Props) {
  const { t } = useTranslation('ai');

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">{t('title')}</Text>
        <Text style={styles.intro}>{t('intro')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card icon="🔒" title={t('onDevice.title')} body={t('onDevice.body')} accent={colors.action} />
        <Card icon="☁️" title={t('cloud.title')} body={t('cloud.body')} accent={colors.identity} />
        <Card icon="✦" title={t('coach.title')} body={t('coach.body')} accent={colors.violetDeep} />
        <Card icon="🧪" title={t('local.title')} body={t('local.body')} accent={colors.reward}>
          <Text style={styles.steps}>{t('local.steps')}</Text>
        </Card>

        <PrimaryButton label={t('ctaSettings')} variant="primary" onPress={() => navigation.navigate('Main', { screen: 'Settings' })} />
        <PrimaryButton label={t('ctaGallery')} variant="ghost" onPress={() => void Linking.openURL(GALLERY_URL)} />
      </ScrollView>
    </ScreenContainer>
  );
}

function Card({ icon, title, body, accent, children }: { icon: string; title: string; body: string; accent: string; children?: React.ReactNode }) {
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.cardBody}>{body}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, paddingTop: spacing.md, paddingBottom: spacing.md },
  title: { ...typography.heading, color: colors.textPrimary },
  intro: { ...typography.body, color: colors.textSecondary },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderLeftWidth: 5, padding: spacing.lg, gap: spacing.sm, ...shadows.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardIcon: { fontSize: 22 },
  cardTitle: { ...typography.title, color: colors.textPrimary, fontWeight: '800', flex: 1 },
  cardBody: { ...typography.body, color: colors.textSecondary },
  steps: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
});
