import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton, ScreenContainer, TextField } from '@/components';
import { BucketIcon } from '@/components/BucketIcon';
import { colors, radii, spacing, typography } from '@/theme';
import { useBuckets } from '@/state/BucketsContext';
import { BUCKET_ICONS, DEFAULT_BUCKET_ICON_ID } from '@/data/bucketIcons';
import {
  BUCKET_COLORS,
  DEFAULT_BUCKET_COLOR_ID,
  getBucketColor,
  validateBucketName,
  type BucketColorId,
} from '@/lib/buckets';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BucketEdit'>;

export function BucketEditScreen({ route, navigation }: Props) {
  const { buckets, assignments, createBucket, renameBucket, restyleBucket, deleteBucket } = useBuckets();
  const editingId = route.params?.bucketId;
  const existing = editingId ? buckets.find((b) => b.id === editingId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [iconId, setIconId] = useState(existing?.iconId ?? DEFAULT_BUCKET_ICON_ID);
  const [colorId, setColorId] = useState<BucketColorId>(existing?.colorId ?? DEFAULT_BUCKET_COLOR_ID);
  const [error, setError] = useState<string | undefined>();

  const accent = getBucketColor(colorId).accent;

  const handleSave = async () => {
    const result = validateBucketName(name, { buckets, assignments }, editingId);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    if (existing) {
      await renameBucket(existing.id, name);
      await restyleBucket(existing.id, { iconId, colorId });
    } else {
      await createBucket({ name, iconId, colorId });
    }
    navigation.goBack();
  };

  const handleDelete = async () => {
    if (existing) {
      await deleteBucket(existing.id);
      navigation.goBack();
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          {existing ? 'Edit bucket' : 'New bucket'}
        </Text>
        <PrimaryButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Live preview */}
        <View style={styles.preview}>
          <View style={[styles.previewIcon, { backgroundColor: getBucketColor(colorId).soft }]}>
            <BucketIcon iconId={iconId} size={32} tint={accent} />
          </View>
          <Text style={styles.previewName} numberOfLines={1}>
            {name.trim() || 'Your bucket'}
          </Text>
        </View>

        <TextField
          label="Name"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (error) setError(undefined);
          }}
          placeholder="e.g. Health, Work, Learning"
          maxLength={40}
          error={error}
        />

        <Text style={styles.sectionLabel}>Icon</Text>
        <View style={styles.iconGrid} accessibilityRole="radiogroup" accessibilityLabel="Bucket icon">
          {BUCKET_ICONS.map((icon) => {
            const selected = icon.id === iconId;
            return (
              <Pressable
                key={icon.id}
                onPress={() => setIconId(icon.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${icon.name} icon`}
                style={[styles.iconTile, selected && { borderColor: accent, backgroundColor: getBucketColor(colorId).soft }]}
              >
                <BucketIcon iconId={icon.id} size={24} tint={selected ? accent : colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>Color</Text>
        <View style={styles.colorRow} accessibilityRole="radiogroup" accessibilityLabel="Bucket color">
          {BUCKET_COLORS.map((c) => {
            const selected = c.id === colorId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setColorId(c.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${c.id} color`}
                style={[styles.colorDot, { backgroundColor: c.accent }, selected && styles.colorDotSelected]}
              >
                {selected && <Text style={styles.colorCheck}>✓</Text>}
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton label={existing ? 'Save changes' : 'Create bucket'} onPress={handleSave} />
        {existing && (
          <PrimaryButton label="Delete bucket" variant="ghost" onPress={handleDelete} />
        )}
      </ScrollView>
    </ScreenContainer>
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
  content: { gap: spacing.md, paddingBottom: spacing.xl },
  preview: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  previewIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewName: { ...typography.title, color: colors.textPrimary },
  sectionLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.sm },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorDotSelected: { borderColor: colors.textPrimary },
  colorCheck: { color: colors.textOnBrand, fontWeight: '900' },
});
