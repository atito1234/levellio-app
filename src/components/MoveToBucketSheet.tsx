import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BucketIcon } from '@/components/BucketIcon';
import { colors, radii, spacing, typography } from '@/theme';
import { getBucketColor, type HabitBucket } from '@/lib/buckets';

interface Props {
  visible: boolean;
  activityTitle: string;
  buckets: HabitBucket[];
  currentBucketId?: string;
  onSelect: (bucketId: string | null) => void;
  onClose: () => void;
}

/**
 * Accessible, non-gesture way to file an activity into a bucket (or unfile it).
 * This is the keyboard/screen-reader-operable alternative to swipe/drag.
 */
export function MoveToBucketSheet({
  visible,
  activityTitle,
  buckets,
  currentBucketId,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        accessibilityRole="button"
        accessibilityLabel="Close move to bucket"
        onPress={onClose}
      >
        <Pressable style={styles.sheet} accessible={false} onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">
            Move to bucket
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {activityTitle}
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            <Row
              label="Unfiled"
              selected={!currentBucketId}
              accessibilityLabel={`Unfiled${!currentBucketId ? ', selected' : ''}`}
              onPress={() => onSelect(null)}
            >
              <View style={styles.unfiledDot} />
            </Row>
            {buckets.map((b) => {
              const color = getBucketColor(b.colorId);
              const selected = b.id === currentBucketId;
              return (
                <Row
                  key={b.id}
                  label={b.name}
                  selected={selected}
                  accessibilityLabel={`${b.name} bucket${selected ? ', selected' : ''}`}
                  onPress={() => onSelect(b.id)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: color.soft }]}>
                    <BucketIcon iconId={b.iconId} size={20} tint={color.accent} />
                  </View>
                </Row>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({
  label,
  selected,
  accessibilityLabel,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.row, selected && styles.rowSelected]}
    >
      {children}
      <Text style={[styles.rowLabel, selected && styles.rowLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {selected && (
        <Text style={styles.check} accessibilityElementsHidden>
          ✓
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(27,27,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '75%',
  },
  title: { ...typography.title, color: colors.textPrimary },
  sub: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  list: { flexGrow: 0 },
  listContent: { gap: spacing.xs, paddingBottom: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowSelected: { backgroundColor: colors.violetSoft },
  rowLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  rowLabelSelected: { color: colors.violetDeep, fontWeight: '700' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unfiledDot: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  check: { ...typography.title, color: colors.identity },
});
