/**
 * Dragon Den — the "Claim" layer: a trophy shelf of every dragon you've bested
 * (lifetime count + current per-dragon day-streak) and an Armory where battle
 * coins finally buy something. Reads BattlesContext; cosmetic unlocks for now.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer, ScreenHeader, SectionLabel } from '@/components';
import { spacing, typography } from '@/theme';
import { useBattles } from '@/state/BattlesContext';
import { DRAGONS } from '@/data/dragons';
import { BATTLE_UNLOCKS } from '@/data/battleUnlocks';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DragonDen'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const TEAL = '#16C8A8';
const GOLD = '#FFB23E';
const MUTED = '#5A5A72';
const TRACK = '#ECEAE4';

const dragonHex = (colorId: 'violet' | 'teal') => (colorId === 'teal' ? TEAL : VIOLET);

export function DragonDenScreen({ navigation }: Props) {
  const { t } = useTranslation(['battle', 'dragons']);
  const { perDragon, perDragonStreak, coins, ownedUnlocks, buyUnlock, totalSlain } = useBattles();

  return (
    <ScreenContainer backgroundColor={BG}>
      <ScreenHeader
        title={t('den.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('den.back')}
        right={
          <View style={styles.coins} accessibilityLabel={t('den.coinsA11y', { count: coins })}>
            <Text style={styles.coinsText}>🪙 {coins}</Text>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.lead}>{t('den.lead', { count: totalSlain })}</Text>

        <SectionLabel>{t('den.trophies')}</SectionLabel>
        <View style={styles.grid}>
          {DRAGONS.map((d) => {
            const count = perDragon[d.id] ?? 0;
            const streak = perDragonStreak[d.id]?.streak ?? 0;
            const accent = dragonHex(d.colorId);
            const bested = count > 0;
            return (
              <View key={d.id} style={[styles.trophy, { borderColor: bested ? accent : TRACK }, !bested && styles.trophyLocked]}>
                <Text style={styles.trophyEmoji}>{bested ? '🐉' : '🥚'}</Text>
                <Text style={styles.trophyName} numberOfLines={2}>{t('dragons:' + d.id + '.name', { defaultValue: d.name })}</Text>
                {bested ? (
                  <>
                    <Text style={[styles.trophyCount, { color: accent }]}>{t('den.bested', { count })}</Text>
                    {streak > 0 && <Text style={styles.trophyStreak}>🔥 {t('den.streak', { count: streak })}</Text>}
                  </>
                ) : (
                  <Text style={styles.trophyLockedText}>{t('den.unfought')}</Text>
                )}
              </View>
            );
          })}
        </View>

        <SectionLabel>{t('den.armory')}</SectionLabel>
        <Text style={styles.armoryHint}>{t('den.armoryHint')}</Text>
        <View style={styles.armory}>
          {BATTLE_UNLOCKS.map((u) => {
            const owned = ownedUnlocks.includes(u.id);
            const affordable = coins >= u.cost;
            return (
              <View key={u.id} style={styles.unlockRow}>
                <Text style={styles.unlockEmoji}>{u.emoji}</Text>
                <Text style={styles.unlockName} numberOfLines={1}>{t('unlocks.' + u.id)}</Text>
                {owned ? (
                  <Text style={[styles.unlockOwned, { color: TEAL }]}>{t('den.owned')}</Text>
                ) : (
                  <Pressable
                    onPress={() => void buyUnlock(u.id)}
                    disabled={!affordable}
                    accessibilityRole="button"
                    accessibilityLabel={t('den.buyA11y', { name: t('unlocks.' + u.id), cost: u.cost })}
                    style={[styles.buyBtn, !affordable && styles.buyBtnOff]}
                  >
                    <Text style={[styles.buyText, !affordable && styles.buyTextOff]}>🪙 {u.cost}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.heading, color: INK },
  coins: { backgroundColor: '#FFF7E6', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: '#F6E2B0' },
  coinsText: { ...typography.label, color: '#8A5A0A', fontWeight: '800' },

  content: { gap: spacing.md, paddingBottom: spacing.xl },
  lead: { ...typography.body, color: MUTED },
  sectionLabel: { ...typography.label, color: MUTED, letterSpacing: 2, marginTop: spacing.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  trophy: { width: '48%', backgroundColor: CARD, borderRadius: 18, padding: spacing.md, gap: 4, borderWidth: 1.5, alignItems: 'flex-start' },
  trophyLocked: { opacity: 0.7, backgroundColor: '#FAFAF8' },
  trophyEmoji: { fontSize: 30 },
  trophyName: { ...typography.label, color: INK, fontWeight: '800', minHeight: 36 },
  trophyCount: { ...typography.caption, fontWeight: '800' },
  trophyStreak: { ...typography.caption, color: GOLD, fontWeight: '800' },
  trophyLockedText: { ...typography.caption, color: MUTED },

  armoryHint: { ...typography.caption, color: MUTED },
  armory: { gap: spacing.sm },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: CARD, borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: TRACK },
  unlockEmoji: { fontSize: 22 },
  unlockName: { ...typography.body, color: INK, fontWeight: '700', flex: 1 },
  unlockOwned: { ...typography.label, fontWeight: '800' },
  buyBtn: { backgroundColor: '#FFF7E6', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: 6, borderWidth: 1, borderColor: '#F6E2B0' },
  buyBtnOff: { opacity: 0.4 },
  buyText: { ...typography.label, color: '#8A5A0A', fontWeight: '800' },
  buyTextOff: { color: MUTED },
});
