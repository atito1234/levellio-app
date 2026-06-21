import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CapacityRing, ScreenContainer } from '@/components';
import { radii, spacing, typography } from '@/theme';
import {
  ACTION_CAPACITY_LINKS,
  CAPACITY_HEX,
  capacitiesForAction,
  getCapacity,
  ripple,
  type CapacityId,
  type LinkWeight,
} from '@/lib/compounding';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useCapacities } from '@/state/CapacitiesContext';
import { useGame } from '@/state/GameContext';
import { rippleForQuest } from '@/lib/habitCapacity';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Connections'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const VIOLET = '#6C4CF1';
const MUTED = '#5A5A72';
const CANVAS_W = 340;
const CANVAS_H = 420;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Pt {
  x: number;
  y: number;
}

// The calm, airy subset from the v4 design (4 capacities + 4 actions).
const CAP_POS: Record<string, Pt> = {
  energy: { x: 170, y: 116 },
  sleep: { x: 256, y: 210 },
  endurance: { x: 170, y: 304 },
  calm: { x: 84, y: 210 },
};
const ACTION_POS: Record<string, Pt> = {
  water: { x: 54, y: 68 },
  walk: { x: 286, y: 68 },
  breathe: { x: 54, y: 352 },
  'sleep-early': { x: 286, y: 352 },
};
const DISPLAY_CAPS = Object.keys(CAP_POS) as CapacityId[];
const DISPLAY_ACTIONS = Object.keys(ACTION_POS);
const CENTER: Pt = { x: 170, y: 210 };
const CAP_SIZE = 80;

function linkWeight(actionId: string, capId: CapacityId): LinkWeight | undefined {
  return ACTION_CAPACITY_LINKS.find((l) => l.actionId === actionId && l.capacityId === capId)?.weight;
}
function weightWidth(w: LinkWeight): number {
  return w === 'Strong' ? 4 : w === 'Medium' ? 2.6 : 1.4;
}
function deltaFor(actionId: string, capId: CapacityId): number {
  return ripple(actionId).find((d) => d.capacityId === capId)?.delta ?? 0;
}

interface Edge {
  actionId: string;
  capId: CapacityId;
  d: string;
  weight: LinkWeight;
  hue: string;
}

// Gestalt continuity: gentle quadratic curves bowed toward the center read as
// one coherent system rather than a tangle of straight wires.
function curve(a: Pt, b: Pt): string {
  const mx = (a.x + b.x) / 2 + (CENTER.x - (a.x + b.x) / 2) * 0.32;
  const my = (a.y + b.y) / 2 + (CENTER.y - (a.y + b.y) / 2) * 0.32;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

const EDGES: Edge[] = DISPLAY_ACTIONS.flatMap((actionId) =>
  capacitiesForAction(actionId)
    .filter((capId) => DISPLAY_CAPS.includes(capId))
    .map((capId) => ({
      actionId,
      capId,
      d: curve(ACTION_POS[actionId]!, CAP_POS[capId]!),
      weight: linkWeight(actionId, capId)!,
      hue: CAPACITY_HEX[getCapacity(capId).colorId],
    })),
);

export function ConnectionsScreen({ route, navigation }: Props) {
  const { t } = useTranslation('connections');
  const reduced = useReducedMotion();
  const { levels } = useCapacities(); // real, persisted capacity levels
  const { quests } = useGame();
  const [selected, setSelected] = useState<string | null>(null);

  // Localized labels: capacity names come from the shared `capacities` namespace
  // keyed by id; action short labels live in this screen's namespace.
  const capName = (id: CapacityId): string => t('capacities:' + id);
  const actionLabel = (id: string): string => t('action_' + id);
  const joinCapsForAction = (id: string): string => capacitiesForAction(id).map((c) => capName(c)).join(', ');

  // Per-activity focus: highlight the capacities THIS activity strengthens, plus
  // every action that also feeds them (its place in the web).
  const focusQuest = route.params?.questId ? quests.find((q) => q.id === route.params!.questId) : undefined;
  const focusDeltas = focusQuest ? rippleForQuest(focusQuest) : [];
  const focusCaps = new Set<CapacityId>(focusDeltas.map((d) => d.capacityId));
  const focusDeltaFor = (capId: CapacityId): number => focusDeltas.find((d) => d.capacityId === capId)?.delta ?? 0;
  const focusMode = !selected && focusQuest !== undefined;

  const dash = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Flowing dash on the selected edges (processing fluency); skip if reduced.
  useEffect(() => {
    loopRef.current?.stop();
    dash.setValue(0);
    if (selected && !reduced) {
      loopRef.current = Animated.loop(
        Animated.timing(dash, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: false }),
      );
      loopRef.current.start();
    }
    return () => loopRef.current?.stop();
  }, [selected, reduced, dash]);

  const dashOffset = dash.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const highlightedCaps = selected ? new Set(capacitiesForAction(selected)) : focusMode ? focusCaps : null;

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.topbar}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={12}>
          <Text style={styles.chevron}>‹</Text>
        </Pressable>
      </View>

      <Text style={styles.title} accessibilityRole="header">
        {focusQuest ? t('titleFocus') : t('title')}
      </Text>
      <Text style={styles.helper}>
        {focusQuest
          ? t('helperFocus', { title: focusQuest.title, capacities: focusDeltas.map((d) => capName(d.capacityId)).join(', ') })
          : t('helper')}
      </Text>

      <View style={styles.stage}>
        <View style={{ width: CANVAS_W, height: CANVAS_H }}>
          {/* Edges (decorative; the nodes carry the semantics) */}
          <Svg width={CANVAS_W} height={CANVAS_H} style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {EDGES.map((e) => {
              // On when an action is tapped, or (focus mode) when the edge feeds
              // a capacity the focused activity strengthens.
              const isOn = selected ? selected === e.actionId : focusMode && focusCaps.has(e.capId);
              const dim = (selected !== null || focusMode) && !isOn;
              if (isOn && !reduced && selected) {
                // von Restorff focus: the selected path glows violet and flows.
                return (
                  <AnimatedPath
                    key={`${e.actionId}-${e.capId}`}
                    d={e.d}
                    stroke={VIOLET}
                    strokeWidth={weightWidth(e.weight) + 1.5}
                    strokeOpacity={0.95}
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="10,8"
                    strokeDashoffset={dashOffset}
                  />
                );
              }
              return (
                <Path
                  key={`${e.actionId}-${e.capId}`}
                  d={e.d}
                  stroke={isOn ? VIOLET : e.hue}
                  strokeWidth={weightWidth(e.weight) + (isOn ? 1.5 : 0)}
                  strokeOpacity={isOn ? 0.95 : dim ? 0.06 : 0.22}
                  strokeLinecap="round"
                  fill="none"
                />
              );
            })}
          </Svg>

          {/* Capacity nodes — rings show REAL persisted levels; a "+N" preview
              appears when an action that feeds them is selected (honest). */}
          {DISPLAY_CAPS.map((capId) => {
            const cap = getCapacity(capId);
            const pos = CAP_POS[capId]!;
            const fed = highlightedCaps?.has(capId) ?? false;
            const dim = highlightedCaps !== null && !fed;
            const level = Math.round(levels[capId]);
            const previewDelta = selected ? deltaFor(selected, capId) : focusMode ? focusDeltaFor(capId) : 0;
            return (
              <View
                key={capId}
                accessible
                accessibilityRole="image"
                accessibilityLabel={
                  fed && previewDelta
                    ? t('capacityLevelPlusA11y', { name: capName(capId), level, delta: previewDelta })
                    : t('capacityLevelA11y', { name: capName(capId), level })
                }
                style={[styles.capNode, { left: pos.x - CAP_SIZE / 2, top: pos.y - CAP_SIZE / 2, opacity: dim ? 0.38 : 1 }]}
              >
                <CapacityRing level={level} colorId={cap.colorId} size={CAP_SIZE} strokeWidth={6} />
                <View style={styles.capCenter} pointerEvents="none">
                  <Text style={styles.capName}>{capName(capId)}</Text>
                  {fed && previewDelta ? (
                    <Text style={[styles.capPct, { color: CAPACITY_HEX[cap.colorId] }]}>+{previewDelta}</Text>
                  ) : (
                    <Text style={styles.capPct}>{level}%</Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* Action nodes (interactive) */}
          {DISPLAY_ACTIONS.map((actionId) => {
            const pos = ACTION_POS[actionId]!;
            const isSel = selected === actionId;
            const dim = selected !== null && !isSel;
            const caps = joinCapsForAction(actionId);
            return (
              <Pressable
                key={actionId}
                onPress={() => setSelected(isSel ? null : actionId)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={t('actionStrengthensA11y', { action: actionLabel(actionId), capacities: caps })}
                style={[styles.actionNode, { left: pos.x - 46, top: pos.y - 24, opacity: dim ? 0.5 : 1 }, isSel && styles.actionNodeSel]}
              >
                <Text style={[styles.actionText, isSel && styles.actionTextSel]} numberOfLines={1}>
                  {actionLabel(actionId)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { height: 1.4 }]} />
          <Text style={styles.legendText}>{t('legendLight')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { height: 4 }]} />
          <Text style={styles.legendText}>{t('legendStrong')}</Text>
        </View>
      </View>

      <Text style={styles.footnote} accessibilityLiveRegion="polite">
        {selected
          ? t('footnoteSelected', { action: actionLabel(selected), capacities: joinCapsForAction(selected) })
          : focusMode
            ? t('footnoteFocus')
            : t('footnote')}
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', paddingVertical: spacing.sm },
  chevron: { fontSize: 30, lineHeight: 30, color: INK, width: 28 },
  title: { ...typography.heading, color: INK, textAlign: 'center' },
  helper: { ...typography.body, color: MUTED, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.md },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  capNode: {
    position: 'absolute',
    width: CAP_SIZE,
    height: CAP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  capName: { ...typography.caption, color: INK, fontWeight: '700', fontSize: 11 },
  capPct: { ...typography.caption, fontWeight: '800', fontSize: 11 },
  actionNode: {
    position: 'absolute',
    width: 92,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E6E0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    shadowColor: '#1B1B2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  actionNodeSel: { borderColor: VIOLET, borderWidth: 3, transform: [{ scale: 1.06 }] },
  actionText: { ...typography.caption, color: INK, fontWeight: '700', textAlign: 'center' },
  actionTextSel: { color: '#4A32B0' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendLine: { width: 28, borderRadius: 2, backgroundColor: MUTED },
  legendText: { ...typography.caption, color: MUTED },
  footnote: { ...typography.body, color: MUTED, textAlign: 'center', paddingVertical: spacing.md },
});
