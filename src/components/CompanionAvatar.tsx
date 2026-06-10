import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
import type { CompanionStage } from '@/types';

const STAGE: Record<
  CompanionStage,
  { glow: string; core: string; glyph: string; label: string; scale: number }
> = {
  spark: { glow: colors.tealSoft, core: colors.teal, glyph: '✦', label: 'Spark', scale: 0.7 },
  ember: { glow: colors.goldSoft, core: colors.gold, glyph: '✸', label: 'Ember', scale: 0.85 },
  phoenixling: {
    glow: colors.violetSoft,
    core: colors.identity,
    glyph: '✷',
    label: 'Phoenixling',
    scale: 1,
  },
};

interface CompanionAvatarProps {
  stage: CompanionStage;
  size?: number;
}

/** Code-drawn Wisp companion — a glowing orb that grows with its stage. */
export function CompanionAvatar({ stage, size = 96 }: CompanionAvatarProps) {
  const s = STAGE[stage];
  const core = size * 0.62 * s.scale;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Wisp companion: ${s.label}`}
      style={[styles.glow, { width: size, height: size, borderRadius: size / 2, backgroundColor: s.glow }]}
    >
      <View
        style={[
          styles.core,
          { width: core, height: core, borderRadius: core / 2, backgroundColor: s.core },
        ]}
      >
        <Text style={[styles.glyph, { fontSize: core * 0.5 }]} accessibilityElementsHidden>
          {s.glyph}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    color: colors.textOnBrand,
    fontWeight: '700',
  },
});
