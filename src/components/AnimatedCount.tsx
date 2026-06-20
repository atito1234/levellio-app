import React, { useEffect, useRef, useState } from 'react';
import { Animated, type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { durations } from '@/theme/motion';

/** A number that counts up/down to its value. Snaps instantly when reduced motion is on. */
export function AnimatedCount({ value, style }: { value: number; style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(value)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, { toValue: value, duration: durations.base, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [value, reduced, anim]);

  return <Animated.Text style={style}>{display}</Animated.Text>;
}
