import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '@/theme';
import { getBucketColor } from '@/lib/buckets';
import type { Project } from '@/lib/projects';

/**
 * A small "🤝 supports a project" pill in the project's colour. Marks a habit as
 * cross-pollinating: personal AND powering a community project. When several
 * projects are linked, shows the first + a "+N".
 */
export function ProjectBadge({ projects, compact = false }: { projects: Project[]; compact?: boolean }) {
  if (projects.length === 0) return null;
  const first = projects[0]!;
  const c = getBucketColor(first.colorId);
  const extra = projects.length - 1;
  const label = compact ? first.emoji : `${first.emoji} ${first.title}`;
  return (
    <View
      style={[styles.badge, { backgroundColor: c.soft, borderColor: c.accent }]}
      accessibilityLabel={`Supports ${projects.map((p) => p.title).join(', ')}`}
    >
      <Text style={styles.handshake}>🤝</Text>
      <Text style={[styles.text, { color: c.accent }]} numberOfLines={1}>
        {label}
        {extra > 0 ? ` +${extra}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: 200,
  },
  handshake: { fontSize: 11 },
  text: { ...typography.caption, fontWeight: '800', fontSize: 11 },
});
