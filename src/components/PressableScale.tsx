import React, { useRef } from 'react';
import { Animated, Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { springs } from '@/theme/motion';

interface Props extends Omit<PressableProps, 'style'> {
  /** Scale to spring to while pressed (default 0.96). */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** A Pressable with a springy scale on press — drop-in tactile feedback. Snaps (no
 * animation) when the OS "reduce motion" setting is on. */
export function PressableScale({ scaleTo = 0.96, style, children, onPressIn, onPressOut, ...rest }: Props) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = (value: number) => {
    if (reduced) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue: value, ...springs.pop }).start();
  };

  const handleIn = (e: GestureResponderEvent) => {
    springTo(scaleTo);
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    springTo(1);
    onPressOut?.(e);
  };

  return (
    <Pressable onPressIn={handleIn} onPressOut={handleOut} {...rest}>
      <Animated.View style={[{ transform: [{ scale }] }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
