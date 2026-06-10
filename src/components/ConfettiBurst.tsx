import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '@/theme';

const PALETTE = [colors.gold, colors.teal, colors.violetMuted, '#FFFFFF'];

interface Piece {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
  color: string;
}

function buildPieces(count: number, width: number): Piece[] {
  return Array.from({ length: count }).map((_, i) => ({
    left: Math.random() * width,
    size: 6 + Math.random() * 8,
    delay: Math.random() * 400,
    duration: 1400 + Math.random() * 1200,
    drift: (Math.random() - 0.5) * 90,
    spin: 180 + Math.random() * 360,
    color: PALETTE[i % PALETTE.length]!,
  }));
}

/**
 * Lightweight, GPU-driven confetti flourish for the celebration moment. All
 * transforms/opacity run on the native driver. Purely decorative (hidden from
 * screen readers, non-interactive). Render only when motion is allowed.
 */
export function ConfettiBurst({ count = 18 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const pieces = useRef(buildPieces(count, width)).current;
  const progress = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const anims = pieces.map((p, i) =>
      Animated.timing(progress[i]!, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(anims).start();
  }, [pieces, progress]);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((p, i) => {
        const value = progress[i]!;
        const translateY = value.interpolate({ inputRange: [0, 1], outputRange: [-20, height + 20] });
        const translateX = value.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] });
        const rotate = value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] });
        const opacity = value.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.left,
              width: p.size,
              height: p.size * 0.6,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
