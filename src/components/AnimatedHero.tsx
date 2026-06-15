import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { HeroAvatar } from './HeroAvatar';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { HeroPresentation, HeroTier } from '@/types';

interface AnimatedHeroProps {
  presentation: HeroPresentation;
  tier: HeroTier;
  kitId?: string;
  size?: number;
  /** Animate a gentle "breathing" float. Ignored when reduced motion is on. */
  animate?: boolean;
}

/**
 * The hero with a calm, looping float + breath — a living companion for focus
 * moments. Purely decorative motion on the native driver; falls back to a static
 * hero when the user prefers reduced motion. No new native deps.
 */
export function AnimatedHero({ presentation, tier, kitId, size = 160, animate = true }: AnimatedHeroProps) {
  const reduced = useReducedMotion();
  const t = useRef(new Animated.Value(0)).current;
  const on = animate && !reduced;

  useEffect(() => {
    if (!on) {
      t.stopAnimation();
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [on, t]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale }] }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View>
        <HeroAvatar presentation={presentation} tier={tier} kitId={kitId} size={size} />
      </View>
    </Animated.View>
  );
}
