/**
 * A small Tinder-style swipe deck: the user flicks cards right (keep) or left
 * (skip), or taps the equivalent buttons (accessible / reduced-motion). Extracted
 * from the Home hero's gesture pattern so the "pick your activities" flow feels
 * playful, not form-y. Generic over any { id } item via a renderer.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const SCREEN_W = Dimensions.get('window').width;
const THRESHOLD = 56;

export interface DeckItem {
  id: string;
  emoji?: string;
  title: string;
  subtitle?: string;
}

export function SwipeDeck({
  items,
  onDecision,
  onDone,
  accent = colors.violetDeep,
  addWord,
  skipWord,
  addA11y,
  skipA11y,
}: {
  items: DeckItem[];
  /** Called for each card the user keeps (true) or skips (false). */
  onDecision: (item: DeckItem, keep: boolean) => void;
  /** Called once the last card is decided. */
  onDone: () => void;
  accent?: string;
  addWord: string;
  skipWord: string;
  addA11y: string;
  skipA11y: string;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const cardX = useRef(new Animated.Value(0)).current;

  const top = items[index];
  const next = items[index + 1];

  const advance = useCallback(
    (item: DeckItem, keep: boolean) => {
      onDecision(item, keep);
      const last = index + 1 >= items.length;
      setIndex((i) => i + 1);
      cardX.setValue(0);
      if (last) onDone();
    },
    [index, items.length, onDecision, onDone, cardX],
  );

  const decide = useCallback(
    (keep: boolean) => {
      const item = items[index];
      if (!item) return;
      if (reduced) return advance(item, keep);
      Animated.timing(cardX, {
        toValue: keep ? SCREEN_W : -SCREEN_W,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => advance(item, keep));
    },
    [items, index, reduced, advance, cardX],
  );

  const decideRef = useRef(decide);
  decideRef.current = decide;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderMove: (_e, g) => cardX.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        const fling = Math.abs(g.vx) > 0.35;
        if (g.dx > THRESHOLD || (fling && g.vx > 0)) decideRef.current(true);
        else if (g.dx < -THRESHOLD || (fling && g.vx < 0)) decideRef.current(false);
        else Animated.spring(cardX, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () =>
        Animated.spring(cardX, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }).start(),
    }),
  ).current;

  if (!top) return null;

  const rotate = cardX.interpolate({ inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: ['-8deg', '0deg', '8deg'], extrapolate: 'clamp' });
  const opacity = cardX.interpolate({ inputRange: [-SCREEN_W, -SCREEN_W * 0.5, 0, SCREEN_W * 0.5, SCREEN_W], outputRange: [0.2, 1, 1, 1, 0.2], extrapolate: 'clamp' });
  const addStamp = cardX.interpolate({ inputRange: [0, 40, 120], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });
  const skipStamp = cardX.interpolate({ inputRange: [-120, -40, 0], outputRange: [1, 0.4, 0], extrapolate: 'clamp' });

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        {next && (
          <View style={[styles.card, styles.cardBehind]}>
            <Text style={styles.emoji}>{next.emoji ?? '✨'}</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>{next.title}</Text>
          </View>
        )}
        <Animated.View
          {...pan.panHandlers}
          style={[styles.card, { transform: [{ translateX: cardX }, { rotate }], opacity }]}
        >
          <Animated.View style={[styles.stamp, styles.stampAdd, { opacity: addStamp, borderColor: accent }]}>
            <Text style={[styles.stampText, { color: accent }]}>{addWord}</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampSkip, { opacity: skipStamp }]}>
            <Text style={[styles.stampText, { color: colors.textMuted }]}>{skipWord}</Text>
          </Animated.View>
          <Text style={styles.emoji}>{top.emoji ?? '✨'}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>{top.title}</Text>
          {top.subtitle ? <Text style={styles.cardSub} numberOfLines={1}>{top.subtitle}</Text> : null}
        </Animated.View>
      </View>

      <View style={styles.buttons}>
        <Pressable onPress={() => decide(false)} accessibilityRole="button" accessibilityLabel={skipA11y} style={[styles.btn, styles.btnSkip]}>
          <Text style={styles.btnSkipText}>✕</Text>
        </Pressable>
        <Pressable onPress={() => decide(true)} accessibilityRole="button" accessibilityLabel={addA11y} style={[styles.btn, { backgroundColor: accent }]}>
          <Text style={styles.btnAddText}>＋</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.lg },
  stage: { width: '100%', height: 230, alignItems: 'center', justifyContent: 'center' },
  card: {
    position: 'absolute',
    width: '86%',
    minHeight: 200,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  cardBehind: { transform: [{ scale: 0.94 }, { translateY: 14 }], opacity: 0.6 },
  emoji: { fontSize: 56 },
  cardTitle: { ...typography.title, color: colors.textPrimary, fontWeight: '800', textAlign: 'center' },
  cardSub: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },

  stamp: { position: 'absolute', top: 16, borderWidth: 3, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  stampAdd: { right: 16, transform: [{ rotate: '12deg' }] },
  stampSkip: { left: 16, borderColor: '#C9C7C0', transform: [{ rotate: '-12deg' }] },
  stampText: { ...typography.label, fontWeight: '900', letterSpacing: 1 },

  buttons: { flexDirection: 'row', gap: spacing.xl },
  btn: { width: 64, height: 64, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: '#1B1B2A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  btnSkip: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnSkipText: { fontSize: 26, color: colors.textMuted, fontWeight: '900' },
  btnAddText: { fontSize: 30, color: '#FFFFFF', fontWeight: '900' },
});
