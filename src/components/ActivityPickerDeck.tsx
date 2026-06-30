/**
 * ActivityPickerDeck — a paged, arrow-driven chooser: flip through your activities
 * one card at a time (‹ / › or swipe) and select one OR many. Optionally each card
 * carries its own DialTimer so a dragon battle can set a per-activity duration.
 * Reused by the journal (pick activities) and the battle (pick + time each).
 */
import React, { useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/theme';
import { CATEGORY_COLOR, CATEGORY_META } from '@/lib/categories';
import { DialTimer } from '@/components/DialTimer';
import type { Quest } from '@/types';

const THRESHOLD = 56;

export function ActivityPickerDeck({
  visible,
  quests,
  selectedIds,
  onToggle,
  onClose,
  title,
  selectWord,
  selectedWord,
  doneWord,
  emptyText,
  showTimer = false,
  durations,
  onSetDuration,
}: {
  visible: boolean;
  quests: Quest[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onClose: () => void;
  title: string;
  selectWord: string;
  selectedWord: string;
  doneWord: string;
  emptyText: string;
  showTimer?: boolean;
  durations?: Record<string, number>;
  onSetDuration?: (id: string, minutes: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const i = Math.min(index, Math.max(0, quests.length - 1));
  const quest = quests[i];

  const go = (delta: number) => {
    const next = i + delta;
    if (next < 0 || next >= quests.length) return;
    setIndex(next);
    x.setValue(0);
  };
  const goRef = useRef(go);
  goRef.current = go;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
      onPanResponderMove: (_e, g) => x.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        if (g.dx < -THRESHOLD) goRef.current(1);
        else if (g.dx > THRESHOLD) goRef.current(-1);
        else Animated.spring(x, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => Animated.spring(x, { toValue: 0, friction: 7, tension: 70, useNativeDriver: true }).start(),
    }),
  ).current;

  const on = quest ? selectedIds.has(quest.id) : false;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel={doneWord} onPress={onClose}>
        <Pressable style={styles.sheet} accessible={false} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={doneWord} hitSlop={10}>
              <Text style={styles.done}>{doneWord}{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</Text>
            </Pressable>
          </View>

          {!quest ? (
            <Text style={styles.empty}>{emptyText}</Text>
          ) : (
            <>
              <View style={styles.row}>
                <Pressable onPress={() => go(-1)} disabled={i === 0} accessibilityRole="button" accessibilityLabel="‹" hitSlop={10} style={[styles.arrow, i === 0 && styles.arrowOff]}>
                  <Text style={styles.arrowText}>‹</Text>
                </Pressable>

                <Animated.View {...pan.panHandlers} style={[styles.card, { transform: [{ translateX: x }] }]}>
                  <View style={[styles.dot, { backgroundColor: CATEGORY_COLOR[quest.category] }]} />
                  <Text style={styles.cardEmoji}>{CATEGORY_META[quest.category].icon}</Text>
                  <Text style={styles.cardTitle} numberOfLines={2}>{quest.title}</Text>

                  {showTimer && onSetDuration && (
                    <DialTimer
                      minutes={durations?.[quest.id] ?? 25}
                      onChange={(m) => onSetDuration(quest.id, m)}
                      size={130}
                      stroke={12}
                      color={CATEGORY_COLOR[quest.category]}
                      centerLabel={`${durations?.[quest.id] ?? 25}m`}
                    />
                  )}

                  <Pressable
                    onPress={() => onToggle(quest.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.toggle, on && styles.toggleOn]}
                  >
                    <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{on ? `✓ ${selectedWord}` : selectWord}</Text>
                  </Pressable>
                </Animated.View>

                <Pressable onPress={() => go(1)} disabled={i >= quests.length - 1} accessibilityRole="button" accessibilityLabel="›" hitSlop={10} style={[styles.arrow, i >= quests.length - 1 && styles.arrowOff]}>
                  <Text style={styles.arrowText}>›</Text>
                </Pressable>
              </View>

              <Text style={styles.position}>{i + 1} / {quests.length}</Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(27,27,42,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.title, color: colors.textPrimary, fontWeight: '800' },
  done: { ...typography.label, color: colors.identity, fontWeight: '800' },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.xl },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  arrow: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  arrowOff: { opacity: 0.3 },
  arrowText: { fontSize: 28, lineHeight: 30, color: colors.textPrimary },

  card: { flex: 1, minHeight: 220, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: radii.pill },
  cardEmoji: { fontSize: 40 },
  cardTitle: { ...typography.title, color: colors.textPrimary, fontWeight: '800', textAlign: 'center' },
  toggle: { borderRadius: radii.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1.5, borderColor: colors.identity, marginTop: spacing.xs },
  toggleOn: { backgroundColor: colors.identity },
  toggleText: { ...typography.label, color: colors.identity, fontWeight: '800' },
  toggleTextOn: { color: '#FFFFFF' },

  position: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
