import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';
import type { HeroPresentation, HeroTier } from '@/types';

/** Tier accent ramp — prestige rises violet -> teal -> gold. */
const TIER_ACCENT: Record<HeroTier, { ring: string; soft: string; body: string }> = {
  novice: { ring: colors.violetMuted, soft: colors.violetSoft, body: colors.identity },
  pathfinder: { ring: colors.teal, soft: colors.tealSoft, body: colors.tealDeep },
  luminary: { ring: colors.gold, soft: colors.goldSoft, body: colors.goldDeep },
};

const TIER_LABEL: Record<HeroTier, string> = {
  novice: 'Novice',
  pathfinder: 'Pathfinder',
  luminary: 'Luminary',
};

const SKIN = '#E9C6A8';
const HAIR = '#2E2A3A';

interface HeroAvatarProps {
  presentation: HeroPresentation;
  tier: HeroTier;
  size?: number;
}

/**
 * Code-drawn flat hero portrait. A single shared silhouette (head + shoulders)
 * with presentation expressed only through the hairline — female / male /
 * neutral are all valid for any hero. Tier drives the accent colors.
 */
export function HeroAvatar({ presentation, tier, size = 160 }: HeroAvatarProps) {
  const accent = TIER_ACCENT[tier];
  const headD = size * 0.4;
  const bodyW = size * 0.64;
  const bodyH = size * 0.5;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`${capitalize(presentation)} hero, ${TIER_LABEL[tier]} tier`}
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: accent.soft,
          borderColor: accent.ring,
        },
      ]}
    >
      {/* Long hair sits behind the head (female presentation). */}
      {presentation === 'female' && (
        <View
          style={{
            position: 'absolute',
            top: size * 0.12,
            width: size * 0.56,
            height: size * 0.62,
            borderRadius: size * 0.28,
            backgroundColor: HAIR,
          }}
        />
      )}

      {/* Shoulders / body. */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: bodyW,
          height: bodyH,
          borderTopLeftRadius: bodyW / 2,
          borderTopRightRadius: bodyW / 2,
          backgroundColor: accent.body,
        }}
      />

      {/* Head. */}
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          width: headD,
          height: headD,
          borderRadius: headD / 2,
          backgroundColor: SKIN,
        }}
      />

      {/* Front hairline for male (short cap) and neutral (rounded top). */}
      {presentation !== 'female' && (
        <View
          style={{
            position: 'absolute',
            top: size * 0.15,
            width: headD * (presentation === 'neutral' ? 1.08 : 1.02),
            height: presentation === 'neutral' ? size * 0.3 : size * 0.22,
            borderTopLeftRadius: headD,
            borderTopRightRadius: headD,
            backgroundColor: HAIR,
          }}
        />
      )}

      {/* Luminary crown accent. */}
      {tier === 'luminary' && (
        <Text style={[styles.crown, { top: size * 0.02 }]} accessibilityElementsHidden>
          ★
        </Text>
      )}
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 3,
  },
  crown: {
    position: 'absolute',
    fontSize: 22,
    color: colors.gold,
  },
});
