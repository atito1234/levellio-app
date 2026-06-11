import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { radii, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CAPACITY_HEX, getAction, getCapacity, ripple } from '@/lib/compounding';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Ripple'>;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const INK = '#1F2937';
const BG = '#F7F6F2';
const ACTION_TEAL = '#16C8A8';
const TRACK = '#E8E6E0';

const RING = 200;
const STROKE = 16;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function RippleScreen({ route, navigation }: Props) {
  const reduced = useReducedMotion();
  const actionId = route.params?.actionId ?? 'water';
  const action = getAction(actionId) ?? getAction('water')!;
  // Real model output — the screen never shows invented numbers.
  const deltas = ripple(action.id).slice(0, 3);

  const [done, setDone] = useState(false);
  const fill = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const chipAnims = useRef(deltas.map(() => new Animated.Value(0))).current;

  const handleDone = useCallback(() => {
    if (done) return;
    setDone(true);

    if (reduced) {
      // Static completed state — no motion.
      fill.setValue(1);
      chipAnims.forEach((a) => a.setValue(1));
      return;
    }

    Animated.timing(fill, { toValue: 1, duration: 700, useNativeDriver: false }).start();
    Animated.timing(rippleAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    Animated.stagger(
      150,
      chipAnims.map((a) => Animated.spring(a, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true })),
    ).start(() => {
      // Subtle, calm loop once the ripple has landed.
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, [done, reduced, fill, rippleAnim, pulse, chipAnims]);

  const dashoffset = fill.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.35, 0] });

  const summary = deltas
    .map((d) => `${getCapacity(d.capacityId).name} up ${d.delta} percent`)
    .join(', ');

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
        >
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.actionName} accessibilityRole="header">
          {action.name}
        </Text>

        <View style={styles.ringStage}>
          {/* Expanding ripple (decorative, motion only) */}
          {!reduced && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ripple,
                { opacity: rippleOpacity, transform: [{ scale: rippleScale }] },
              ]}
            />
          )}
          <Animated.View style={{ transform: [{ scale: reduced ? 1 : ringScale }] }}>
            <Svg width={RING} height={RING} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={TRACK} strokeWidth={STROKE} fill="none" />
              <G transform={`rotate(-90, ${RING / 2}, ${RING / 2})`}>
                <AnimatedCircle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={R}
                  stroke={ACTION_TEAL}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={CIRC}
                  strokeDashoffset={done && reduced ? 0 : dashoffset}
                />
              </G>
            </Svg>
            <View style={styles.ringCenter} pointerEvents="none">
              <Text style={styles.ringCenterText}>{done ? 'Done' : 'Today'}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Capacity chips — real deltas, staggered in on completion */}
        <View style={styles.chips} accessibilityLiveRegion="polite">
          {done ? (
            deltas.map((d, i) => {
              const cap = getCapacity(d.capacityId);
              const hue = CAPACITY_HEX[cap.colorId];
              const a = chipAnims[i]!;
              return (
                <Animated.View
                  key={d.capacityId}
                  accessibilityLabel={`${cap.name} up ${d.delta} percent`}
                  style={[
                    styles.chip,
                    { borderColor: hue },
                    {
                      opacity: a,
                      transform: [
                        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                        { scale: a.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.9, 1.06, 1] }) },
                      ],
                    },
                  ]}
                >
                  <View style={[styles.chipDot, { backgroundColor: hue }]} />
                  <Text style={styles.chipText}>
                    {cap.name} <Text style={[styles.chipDelta, { color: hue }]}>+{d.delta}%</Text>
                  </Text>
                </Animated.View>
              );
            })
          ) : (
            <Text style={styles.hint}>Tap Done to feel the ripple.</Text>
          )}
        </View>

        {done && <Text style={styles.srOnly} accessibilityLiveRegion="polite">{summary}</Text>}

        <Text style={styles.caption}>One action. Many rings move.</Text>
      </View>

      <Pressable
        onPress={handleDone}
        disabled={done}
        accessibilityRole="button"
        accessibilityState={{ disabled: done }}
        accessibilityLabel={done ? `${action.name} completed` : `Mark ${action.name} done`}
        style={[styles.doneBtn, done && styles.doneBtnDone]}
      >
        <Text style={styles.doneText}>{done ? '✓ Logged' : 'Done'}</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', paddingVertical: spacing.sm },
  back: { ...typography.body, color: INK, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  actionName: { ...typography.heading, color: INK, textAlign: 'center' },
  ringStage: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ripple: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: ACTION_TEAL,
  },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringCenterText: { ...typography.title, color: INK },
  chips: { gap: spacing.sm, minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  chipDot: { width: 10, height: 10, borderRadius: 5 },
  chipText: { ...typography.body, color: INK, fontWeight: '600' },
  chipDelta: { fontWeight: '800' },
  hint: { ...typography.body, color: '#5A5A72' },
  caption: { ...typography.body, color: '#5A5A72', textAlign: 'center', fontStyle: 'italic' },
  srOnly: { width: 1, height: 1, opacity: 0 },
  doneBtn: {
    backgroundColor: ACTION_TEAL,
    borderRadius: radii.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  doneBtnDone: { backgroundColor: '#D6F7EF' },
  doneText: { ...typography.title, color: '#06281F', fontWeight: '800' },
});
