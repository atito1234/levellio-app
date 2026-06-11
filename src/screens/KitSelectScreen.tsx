import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer } from '@/components';
import { KitJersey } from '@/components/kitGraphics';
import { colors, radii, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import {
  kitColorway,
  NO_KIT_ID,
  WORLD_CUP_KITS,
  type WorldCupKit,
} from '@/data/worldCupKits';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'KitSelect'>;

/** Pick a World Cup nation kit (or the classic look) for the hero avatar. */
export function KitSelectScreen({ navigation }: Props) {
  const { character, setKit } = useGame();
  const currentId = character?.kitId ?? NO_KIT_ID;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Choose your kit
        </Text>
        <PrimaryButton label="Close" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
      <Text style={styles.note}>
        Original nation colorways — pick one to wear it everywhere your hero appears.
      </Text>

      <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.grid}>
        <ClassicCell selected={currentId === NO_KIT_ID} onPress={() => setKit(NO_KIT_ID)} />
        {WORLD_CUP_KITS.map((kit) => (
          <KitCell
            key={kit.id}
            kit={kit}
            selected={currentId === kit.id}
            onPress={() => setKit(kit.id)}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function Cell({
  selected,
  label,
  a11yLabel,
  onPress,
  children,
}: {
  selected: boolean;
  label: string;
  a11yLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11yLabel}
      style={[styles.cell, selected && styles.cellSelected]}
    >
      <View style={styles.jersey}>
        {children}
        {selected && (
          <View style={styles.check} accessibilityElementsHidden>
            <Text style={styles.checkMark}>✓</Text>
          </View>
        )}
      </View>
      <Text style={[styles.cellLabel, selected && styles.cellLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function ClassicCell({ selected, onPress }: { selected: boolean; onPress: () => void }) {
  return (
    <Cell
      selected={selected}
      label="Classic"
      a11yLabel={`Classic look, no kit${selected ? ', selected' : ''}`}
      onPress={onPress}
    >
      <View style={styles.classicSwatch} />
    </Cell>
  );
}

function KitCell({ kit, selected, onPress }: { kit: WorldCupKit; selected: boolean; onPress: () => void }) {
  return (
    <Cell
      selected={selected}
      label={kit.nationName}
      a11yLabel={`${kitColorway(kit)}, ${kit.pattern} kit${selected ? ', selected' : ''}`}
      onPress={onPress}
    >
      <KitJersey kit={kit} size={52} />
    </Cell>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  title: { ...typography.heading, color: colors.textPrimary, flex: 1 },
  note: { ...typography.caption, color: colors.textSecondary, paddingBottom: spacing.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.md,
    paddingBottom: spacing.xl,
  },
  cell: {
    width: '31%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: colors.identity,
    backgroundColor: colors.violetSoft,
  },
  jersey: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classicSwatch: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.teal,
  },
  check: {
    position: 'absolute',
    top: -4,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.identity,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: colors.textOnBrand, fontSize: 12, fontWeight: '900' },
  cellLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  cellLabelSelected: { color: colors.violetDeep, fontWeight: '700' },
});
