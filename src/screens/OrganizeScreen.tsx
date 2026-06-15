import React, { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer } from '@/components';
import { BucketIcon } from '@/components/BucketIcon';
import { MoveToBucketSheet } from '@/components/MoveToBucketSheet';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { useGame } from '@/state/GameContext';
import { useBuckets } from '@/state/BucketsContext';
import { useSettings } from '@/state/SettingsContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getBucketColor, type HabitBucket } from '@/lib/buckets';
import type { Quest } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
const SWIPE_THRESHOLD = 64;

export function OrganizeScreen() {
  const navigation = useNavigation<Nav>();
  const { quests } = useGame();
  const { buckets, counts, assignments, assignActivity, moveBucket } = useBuckets();
  const { settings, update } = useSettings();
  const reduced = useReducedMotion();

  const viewMode = settings.bucketViewMode;
  const [moveTarget, setMoveTarget] = useState<Quest | null>(null);

  const unfiledCount = quests.filter((q) => !assignments[q.id]).length;

  const setView = (mode: 'list' | 'buckets') => {
    if (mode !== viewMode) void update({ bucketViewMode: mode });
  };

  return (
    <ScreenContainer backgroundColor="#F7F6F2">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Organize
        </Text>
        <PrimaryButton label="Done" variant="ghost" onPress={() => navigation.goBack()} />
      </View>

      {/* View-mode toggle (remembered) */}
      <View
        style={styles.toggle}
        accessibilityRole="radiogroup"
        accessibilityLabel="Choose how to view your activities"
      >
        <ToggleButton label="List" active={viewMode === 'list'} onPress={() => setView('list')} />
        <ToggleButton
          label="Buckets"
          active={viewMode === 'buckets'}
          onPress={() => setView('buckets')}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {viewMode === 'list' ? (
          <ListView
            quests={quests}
            buckets={buckets}
            assignments={assignments}
            reduced={reduced}
            onMove={(q) => setMoveTarget(q)}
            onUnfile={(q) => void assignActivity(q.id, null)}
          />
        ) : (
          <BucketsView
            buckets={buckets}
            counts={counts}
            unfiledCount={unfiledCount}
            onNew={() => navigation.navigate('BucketEdit', {})}
            onEdit={(id) => navigation.navigate('BucketEdit', { bucketId: id })}
            onMoveBucket={(id, delta) => void moveBucket(id, delta)}
            onBattle={(id) => navigation.navigate('BattleSetup', { bucketId: id })}
          />
        )}
      </ScrollView>

      <MoveToBucketSheet
        visible={moveTarget !== null}
        activityTitle={moveTarget?.title ?? ''}
        buckets={buckets}
        currentBucketId={moveTarget ? assignments[moveTarget.id] : undefined}
        onSelect={(bucketId) => {
          if (moveTarget) void assignActivity(moveTarget.id, bucketId);
          setMoveTarget(null);
        }}
        onClose={() => setMoveTarget(null)}
      />
    </ScreenContainer>
  );
}

function ToggleButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} view`}
      style={[styles.toggleBtn, active && styles.toggleBtnActive]}
    >
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ListView({
  quests,
  buckets,
  assignments,
  reduced,
  onMove,
  onUnfile,
}: {
  quests: Quest[];
  buckets: HabitBucket[];
  assignments: Record<string, string>;
  reduced: boolean;
  onMove: (q: Quest) => void;
  onUnfile: (q: Quest) => void;
}) {
  if (quests.length === 0) {
    return <Text style={styles.empty}>No activities yet. Create a quest first, then file it here.</Text>;
  }
  return (
    <View style={styles.list}>
      {quests.map((q) => (
        <ActivityRow
          key={q.id}
          quest={q}
          bucket={buckets.find((b) => b.id === assignments[q.id])}
          reduced={reduced}
          onMove={() => onMove(q)}
          onUnfile={() => onUnfile(q)}
        />
      ))}
      <Text style={styles.hint}>
        {reduced
          ? 'Tap “Move” to file an activity into a bucket.'
          : 'Swipe right to file, swipe left to unfile — or tap “Move”.'}
      </Text>
    </View>
  );
}

function ActivityRow({
  quest,
  bucket,
  reduced,
  onMove,
  onUnfile,
}: {
  quest: Quest;
  bucket?: HabitBucket;
  reduced: boolean;
  onMove: () => void;
  onUnfile: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;

  // Swipe is an enhancement; the "Move" button is the accessible alternative.
  // When reduce-motion is on, we skip the gesture entirely.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => !reduced && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => translateX.setValue(Math.max(-100, Math.min(100, g.dx))),
      onPanResponderRelease: (_e, g) => {
        if (g.dx > SWIPE_THRESHOLD) onMove();
        else if (g.dx < -SWIPE_THRESHOLD) onUnfile();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const color = bucket ? getBucketColor(bucket.colorId) : null;
  const handlers = reduced ? {} : pan.panHandlers;

  return (
    <Animated.View style={[styles.row, { transform: [{ translateX }] }]} {...handlers}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {quest.title}
        </Text>
        {bucket && color ? (
          <View style={[styles.chip, { backgroundColor: color.soft }]}>
            <BucketIcon iconId={bucket.iconId} size={14} tint={color.accent} />
            <Text style={[styles.chipText, { color: color.accent }]} numberOfLines={1}>
              {bucket.name}
            </Text>
          </View>
        ) : (
          <Text style={styles.unfiled}>Unfiled</Text>
        )}
      </View>
      <Pressable
        onPress={onMove}
        accessibilityRole="button"
        accessibilityLabel={`Move ${quest.title} to a bucket`}
        style={styles.moveBtn}
      >
        <Text style={styles.moveBtnText}>Move</Text>
      </Pressable>
    </Animated.View>
  );
}

function BucketsView({
  buckets,
  counts,
  unfiledCount,
  onNew,
  onEdit,
  onMoveBucket,
  onBattle,
}: {
  buckets: HabitBucket[];
  counts: Record<string, number>;
  unfiledCount: number;
  onNew: () => void;
  onEdit: (id: string) => void;
  onMoveBucket: (id: string, delta: number) => void;
  onBattle: (id: string) => void;
}) {
  return (
    <View style={styles.list}>
      <PrimaryButton label="＋ New bucket" onPress={onNew} />
      {buckets.length === 0 ? (
        <Text style={styles.empty}>No buckets yet. Create one to group related activities.</Text>
      ) : (
        buckets.map((b, i) => {
          const color = getBucketColor(b.colorId);
          const count = counts[b.id] ?? 0;
          return (
            <View
              key={b.id}
              style={styles.bucketCard}
              accessibilityLabel={`${b.name} bucket, ${count} ${count === 1 ? 'activity' : 'activities'}`}
            >
              <View style={[styles.bucketIcon, { backgroundColor: color.soft }]}>
                <BucketIcon iconId={b.iconId} size={26} tint={color.accent} />
              </View>
              <View style={styles.bucketInfo}>
                <Text style={styles.bucketName} numberOfLines={1}>
                  {b.name}
                </Text>
                <Text style={styles.bucketCount}>
                  {count} {count === 1 ? 'activity' : 'activities'}
                </Text>
              </View>
              <View style={styles.bucketActions}>
                <IconBtn label={`Move ${b.name} up`} disabled={i === 0} text="↑" onPress={() => onMoveBucket(b.id, -1)} />
                <IconBtn
                  label={`Move ${b.name} down`}
                  disabled={i === buckets.length - 1}
                  text="↓"
                  onPress={() => onMoveBucket(b.id, 1)}
                />
                <IconBtn label={`Edit ${b.name}`} text="✎" onPress={() => onEdit(b.id)} />
                {count > 0 && <IconBtn label={`Battle the ${b.name} ritual`} text="⚔️" onPress={() => onBattle(b.id)} />}
              </View>
            </View>
          );
        })
      )}
      <View style={styles.bucketCard} accessibilityLabel={`Unfiled, ${unfiledCount} activities`}>
        <View style={[styles.bucketIcon, styles.unfiledIcon]} />
        <View style={styles.bucketInfo}>
          <Text style={styles.bucketName}>Unfiled</Text>
          <Text style={styles.bucketCount}>
            {unfiledCount} {unfiledCount === 1 ? 'activity' : 'activities'}
          </Text>
        </View>
      </View>
    </View>
  );
}

function IconBtn({
  label,
  text,
  disabled,
  onPress,
}: {
  label: string;
  text: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={label}
      style={[styles.iconBtn, disabled && styles.iconBtnDisabled]}
    >
      <Text style={styles.iconBtnText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  title: { ...typography.heading, color: colors.textPrimary, flex: 1 },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
    marginBottom: spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.surface, ...shadows.sm },
  toggleText: { ...typography.label, color: colors.textSecondary },
  toggleTextActive: { color: colors.identity },
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  list: { gap: spacing.sm },
  empty: { ...typography.body, color: colors.textSecondary, paddingVertical: spacing.lg, textAlign: 'center' },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', paddingTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  rowMain: { flex: 1, gap: 4 },
  rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  chipText: { ...typography.caption, fontWeight: '700' },
  unfiled: { ...typography.caption, color: colors.textMuted },
  moveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.violetSoft,
  },
  moveBtnText: { ...typography.label, color: colors.violetDeep },
  bucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.md,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  bucketIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unfiledIcon: { borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  bucketInfo: { flex: 1, gap: 2 },
  bucketName: { ...typography.title, color: colors.textPrimary },
  bucketCount: { ...typography.caption, color: colors.textSecondary },
  bucketActions: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: { opacity: 0.4 },
  iconBtnText: { ...typography.body, color: colors.textPrimary },
});
