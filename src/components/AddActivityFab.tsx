import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { typography } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSpotlightTarget } from '@/components/spotlight';

const VIOLET = '#6C4CF1';

/**
 * The always-there "add an activity" button — big, obvious, thumb-reachable.
 * A mic glyph signals "speak or type it" (the keyboard's dictation key gives
 * voice with no native deps). Floats bottom-right over any screen.
 *
 * When `highlight` is set (onboarding "add your activities" step), it pulses with
 * a glowing halo and shows an "Add activity" label so the next tap is obvious.
 */
export function AddActivityFab({
  onPress,
  accent = VIOLET,
  highlight = false,
}: {
  onPress: () => void;
  accent?: string;
  highlight?: boolean;
}) {
  const { t } = useTranslation('addActivity');
  const fabTarget = useSpotlightTarget('add-fab');
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!highlight || reduced) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [highlight, reduced, pulse]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.6] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {highlight && (
        <View style={styles.label} pointerEvents="none">
          <Text style={styles.labelText}>{t('addActivityA11y')}</Text>
        </View>
      )}
      <View style={styles.fabWrap} pointerEvents="box-none" {...fabTarget}>
        {highlight && !reduced && (
          <Animated.View
            pointerEvents="none"
            style={[styles.halo, { backgroundColor: accent, opacity: haloOpacity, transform: [{ scale: haloScale }] }]}
          />
        )}
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t('title')}
          style={[styles.fab, { backgroundColor: accent, shadowColor: accent }]}
          hitSlop={12}
        >
          <Text style={styles.mic}>🎙️</Text>
          <View style={styles.plusBadge}>
            <Text style={styles.plus}>＋</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 18, bottom: 18, alignItems: 'flex-end', gap: 8 },
  fabWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 64, height: 64, borderRadius: 32 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  mic: { fontSize: 28 },
  plusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { ...typography.caption, color: VIOLET, fontWeight: '900', fontSize: 13, lineHeight: 15 },
  label: {
    backgroundColor: '#1F2937',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  labelText: { ...typography.caption, color: '#FFFFFF', fontWeight: '800' },
});
