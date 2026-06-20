/**
 * Motion tokens — one source of truth for animation timing so micro-interactions
 * feel consistent. Pair every use with `useReducedMotion()` (skip/snap when true)
 * and `useNativeDriver: true` wherever the property allows it.
 */
export const durations = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

/** Spring presets for `Animated.spring`. `pop` = snappy tap feedback; `gentle` = calm. */
export const springs = {
  pop: { friction: 5, tension: 140, useNativeDriver: true },
  gentle: { friction: 7, tension: 60, useNativeDriver: true },
} as const;
