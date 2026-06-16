import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { typography } from '@/theme';

const VIOLET = '#6C4CF1';

/**
 * The always-there "add an activity" button — big, obvious, thumb-reachable.
 * A mic glyph signals "speak or type it" (the keyboard's dictation key gives
 * voice with no native deps). Floats bottom-right over any screen.
 */
export function AddActivityFab({ onPress, accent = VIOLET }: { onPress: () => void; accent?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add an activity"
      style={[styles.fab, { backgroundColor: accent, shadowColor: accent }]}
      hitSlop={12}
    >
      <Text style={styles.mic}>🎙️</Text>
      <View style={styles.plusBadge}>
        <Text style={styles.plus}>＋</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 18,
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
});
