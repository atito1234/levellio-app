import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { radii, spacing, typography } from '@/theme';
import { useProjectSummary } from '@/state/ProjectsContext';
import { cycleEndLabel, projectColor, type Project } from '@/lib/projects';

const INK = '#1F2937';
const CARD = '#FFFFFF';
const VIOLET = '#6C4CF1';
const GOLD = '#FFB23E';
const MUTED = '#5A5A72';
const TRACK = '#E8E6E0';
const PAD = 20;

const RING = 52;
const STROKE = 6;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Tiny weekly-progress ring — project colour, gold at 100% (the reward cue). */
function MiniRing({ pct, accent }: { pct: number; accent: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const stroke = clamped >= 100 ? GOLD : accent;
  const offset = C * (1 - clamped / 100);
  return (
    <View style={styles.ringWrap}>
      <Svg width={RING} height={RING} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={TRACK} strokeWidth={STROKE} fill="none" />
        {clamped > 0 && (
          <G transform={`rotate(-90, ${RING / 2}, ${RING / 2})`}>
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={stroke}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={C}
              strokeDashoffset={offset}
            />
          </G>
        )}
      </Svg>
      <View style={styles.ringCenter} pointerEvents="none">
        <Text style={styles.ringPct}>{clamped}%</Text>
      </View>
    </View>
  );
}

/** A live project card: ring + this-week status + today's teammate pulse. */
function ProjectStripCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const summary = useProjectSummary(project.id);
  const pct = summary?.cycle.pct ?? 0;
  const accent = projectColor(project).accent;
  const active = summary?.activeToday ?? 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${project.title}. ${pct}% of this week's goal. ${active} active today.`}
      style={styles.card}
    >
      <View style={styles.cardHead}>
        <Text style={styles.cardEmoji}>{project.emoji}</Text>
        <MiniRing pct={pct} accent={accent} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>
        {project.title}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {cycleEndLabel()}
      </Text>
      <Text style={[styles.cardPulse, { color: accent }]} numberOfLines={1}>
        {active > 0 ? `👥 ${active} active today` : 'Be the first today'}
      </Text>
    </Pressable>
  );
}

/**
 * "Community" strip on Today — the member's joined projects with live weekly
 * progress, so collective momentum becomes part of the daily ritual.
 */
export function ProjectsStrip({
  projects,
  onOpen,
  onBrowse,
}: {
  projects: Project[];
  onOpen: (projectId: string) => void;
  onBrowse: () => void;
}) {
  if (projects.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>YOUR COMMUNITY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {projects.map((p) => (
          <ProjectStripCard key={p.id} project={p} onPress={() => onOpen(p.id)} />
        ))}
        <Pressable onPress={onBrowse} accessibilityRole="button" accessibilityLabel="Browse community projects" style={styles.more}>
          <Text style={styles.morePlus}>＋</Text>
          <Text style={styles.moreText}>Find more</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/**
 * "Around the world" strip — opt-in discovery of featured community projects, so
 * members feel part of a worldwide movement. Gated by a Settings toggle.
 */
export function WorldProjectsStrip({
  projects,
  onOpen,
}: {
  projects: Project[];
  onOpen: (projectId: string) => void;
}) {
  if (projects.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>🌍 AROUND THE WORLD</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {projects.map((p) => (
          <ProjectStripCard key={p.id} project={p} onPress={() => onOpen(p.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  heading: { ...typography.label, color: MUTED, letterSpacing: 1, paddingHorizontal: PAD, fontWeight: '800' },
  row: { gap: spacing.sm, paddingHorizontal: PAD, paddingVertical: 2 },
  card: { width: 156, backgroundColor: CARD, borderRadius: radii.lg, padding: spacing.md, gap: 6, borderWidth: 1, borderColor: '#ECEAE4' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardEmoji: { fontSize: 26 },
  ringWrap: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringPct: { ...typography.caption, color: INK, fontWeight: '800', fontSize: 12 },
  cardTitle: { ...typography.label, color: INK, fontWeight: '700', minHeight: 34 },
  cardMeta: { ...typography.caption, color: MUTED, fontSize: 11 },
  cardPulse: { ...typography.caption, fontWeight: '800', fontSize: 11 },
  more: { width: 110, backgroundColor: '#F4F1FE', borderRadius: radii.lg, padding: spacing.md, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: '#E2DBFB' },
  morePlus: { fontSize: 22, color: VIOLET, fontWeight: '800' },
  moreText: { ...typography.label, color: VIOLET, fontWeight: '700' },
});
