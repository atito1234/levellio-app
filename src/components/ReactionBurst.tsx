import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface Piece {
  dx: number;
  delay: number;
  duration: number;
}

/**
 * A small flourish of the reacted emoji floating up + fading, anchored to the
 * bottom-center of its container. Mount it with a changing `key` to replay.
 * Decorative + non-interactive; renders nothing when reduced motion is on.
 */
export function ReactionBurst({ emoji, count = 5 }: { emoji: string; count?: number }) {
  const reduced = useReducedMotion();
  const pieces = useRef<Piece[]>(
    Array.from({ length: count }).map((_, i) => ({
      dx: (Math.random() - 0.5) * 44,
      delay: i * 40,
      duration: 600 + Math.random() * 300,
    })),
  ).current;
  const vals = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (reduced) return;
    Animated.parallel(
      pieces.map((p, i) =>
        Animated.timing(vals[i]!, { toValue: 1, duration: p.duration, delay: p.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ),
    ).start();
  }, [pieces, vals, reduced]);

  if (reduced) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => {
        const v = vals[i]!;
        const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
        const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
        const opacity = v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
        const scale = v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 1.1, 0.8] });
        return (
          <Animated.Text
            key={i}
            style={{ position: 'absolute', alignSelf: 'center', bottom: 8, fontSize: 16, opacity, transform: [{ translateX }, { translateY }, { scale }] }}
          >
            {emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}
