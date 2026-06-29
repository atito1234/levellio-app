/**
 * Home "More" hub — a calm bottom-sheet that holds the secondary entry points so
 * the Today screen can stay minimal. Every action remains one tap away. Each tile
 * navigates to an existing screen (or runs a passed callback for AI Suggest).
 */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing, typography } from '@/theme';
import { MEDIA_UPLOADS_ENABLED } from '@/config/features';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function MoreSheet({
  visible,
  onClose,
  onSuggest,
  onFocusGoal,
  canShare,
  suggesting,
}: {
  visible: boolean;
  onClose: () => void;
  onSuggest: () => void;
  /** Open the "focus a goal" picker on the Home (keeps goal UI off the Today screen). */
  onFocusGoal: () => void;
  canShare: boolean;
  suggesting: boolean;
}) {
  const { t } = useTranslation(['dashboard', 'recipes', 'checklists']);
  const navigation = useNavigation<Nav>();

  const go = (run: () => void) => {
    onClose();
    run();
  };

  const tiles: { key: string; icon: string; label: string; onPress: () => void; show?: boolean }[] = [
    { key: 'focusGoal', icon: '🎯', label: t('dashboard:more.focusGoal'), onPress: () => go(onFocusGoal) },
    { key: 'checklists', icon: '✅', label: t('checklists:title'), onPress: () => go(() => navigation.navigate('Checklists')) },
    { key: 'community', icon: '🤝', label: t('dashboard:more.community'), onPress: () => go(() => navigation.navigate('Main', { screen: 'Projects' })) },
    { key: 'share', icon: '✏️', label: t('dashboard:more.share'), onPress: () => go(() => navigation.navigate('PostComposer')), show: canShare },
    { key: 'recipes', icon: '🍽️', label: t('recipes:screen.title'), onPress: () => go(() => navigation.navigate('Recipes')) },
    { key: 'journal', icon: '📓', label: t('dashboard:chips.journal'), onPress: () => go(() => navigation.navigate('Journal')) },
    { key: 'library', icon: '📚', label: t('dashboard:chips.library'), onPress: () => go(() => navigation.navigate('HabitLibrary')) },
    { key: 'buckets', icon: '🗂️', label: t('dashboard:chips.buckets'), onPress: () => go(() => navigation.navigate('Organize')) },
    { key: 'connections', icon: '🔗', label: t('dashboard:chips.connections'), onPress: () => go(() => navigation.navigate('Connections')) },
    { key: 'discover', icon: '🌍', label: t('dashboard:more.discover'), onPress: () => go(() => navigation.navigate('Discover')) },
    { key: 'suggest', icon: '✨', label: suggesting ? '…' : t('dashboard:chips.suggest'), onPress: () => go(onSuggest) },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('dashboard:more.close')}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('dashboard:more.title')}</Text>
          <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
            {tiles.filter((x) => x.show !== false).map((tile) => (
              <Pressable key={tile.key} onPress={tile.onPress} accessibilityRole="button" accessibilityLabel={tile.label} style={styles.tile}>
                <Text style={styles.tileIcon}>{tile.icon}</Text>
                <Text style={styles.tileLabel} numberOfLines={1}>{tile.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {!MEDIA_UPLOADS_ENABLED && null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.xs },
  title: { ...typography.title, color: colors.textPrimary, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.xs },
  tile: { width: '31%', aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tileIcon: { fontSize: 26 },
  tileLabel: { ...typography.caption, color: colors.textPrimary, fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
});
