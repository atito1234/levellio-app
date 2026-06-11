import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenContainer } from '@/components';
import { radii, spacing, typography } from '@/theme';
import {
  ACTION_CAPACITY_LINKS,
  CAPACITY_HEX,
  capacitiesForAction,
  getCapacity,
  type CapacityId,
  type LinkWeight,
} from '@/lib/compounding';
import type { RootStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Connections'>;

const INK = '#1F2937';
const BG = '#F7F6F2';
const CANVAS_W = 340;
const CANVAS_H = 384;

interface Pt {
  x: number;
  y: number;
}

// The calm, airy subset from the v4 design (4 capacities + 4 actions).
const CAP_POS: Record<string, Pt> = {
  energy: { x: 132, y: 150 },
  sleep: { x: 208, y: 150 },
  endurance: { x: 132, y: 236 },
  calm: { x: 208, y: 236 },
};
const ACTION_POS: Record<string, Pt> = {
  water: { x: 48, y: 70 },
  walk: { x: 292, y: 70 },
  breathe: { x: 48, y: 320 },
  'sleep-early': { x: 292, y: 320 },
};
const ACTION_SHORT: Record<string, string> = {
  water: 'Water',
  walk: 'Walk',
  breathe: 'Breathe',
  'sleep-early': 'Sleep early',
};

const DISPLAY_CAPS = Object.keys(CAP_POS) as CapacityId[];
const DISPLAY_ACTIONS = Object.keys(ACTION_POS);

function linkWeight(actionId: string, capId: CapacityId): LinkWeight | undefined {
  return ACTION_CAPACITY_LINKS.find((l) => l.actionId === actionId && l.capacityId === capId)?.weight;
}

function weightWidth(w: LinkWeight): number {
  return w === 'Strong' ? 4.5 : w === 'Medium' ? 2.75 : 1.5;
}

interface Line {
  actionId: string;
  capId: CapacityId;
  a: Pt;
  b: Pt;
  weight: LinkWeight;
}

const LINES: Line[] = DISPLAY_ACTIONS.flatMap((actionId) =>
  capacitiesForAction(actionId)
    .filter((capId) => DISPLAY_CAPS.includes(capId))
    .map((capId) => ({
      actionId,
      capId,
      a: ACTION_POS[actionId]!,
      b: CAP_POS[capId]!,
      weight: linkWeight(actionId, capId)!,
    })),
);

const CENTER: Pt = { x: 170, y: 193 };

function curve(a: Pt, b: Pt): string {
  // Gentle quadratic bowed toward the center for an airy, organic feel.
  const mx = (a.x + b.x) / 2 + (CENTER.x - (a.x + b.x) / 2) * 0.3;
  const my = (a.y + b.y) / 2 + (CENTER.y - (a.y + b.y) / 2) * 0.3;
  return `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
}

export function ConnectionsScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const fedBySelected = selected ? new Set(capacitiesForAction(selected)) : null;

  return (
    <ScreenContainer backgroundColor={BG}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      </View>

      <Text style={styles.title} accessibilityRole="header">
        How your actions connect
      </Text>
      <Text style={styles.helper}>Tap any action to see everything it strengthens.</Text>

      <View style={styles.stage}>
        <View style={{ width: CANVAS_W, height: CANVAS_H }}>
          {/* Connecting lines (decorative; the nodes carry the semantics). */}
          <Svg
            width={CANVAS_W}
            height={CANVAS_H}
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {LINES.map((ln) => {
              const hue = CAPACITY_HEX[getCapacity(ln.capId).colorId];
              const isOn = selected === ln.actionId;
              const dim = selected !== null && !isOn;
              return (
                <Path
                  key={`${ln.actionId}-${ln.capId}`}
                  d={curve(ln.a, ln.b)}
                  stroke={hue}
                  strokeWidth={weightWidth(ln.weight) + (isOn ? 1.5 : 0)}
                  strokeOpacity={isOn ? 0.9 : dim ? 0.07 : 0.25}
                  strokeLinecap="round"
                  fill="none"
                />
              );
            })}
          </Svg>

          {/* Capacity nodes */}
          {DISPLAY_CAPS.map((capId) => {
            const cap = getCapacity(capId);
            const hue = CAPACITY_HEX[cap.colorId];
            const pos = CAP_POS[capId]!;
            const fed = fedBySelected?.has(capId) ?? false;
            const dim = selected !== null && !fed;
            return (
              <View
                key={capId}
                accessible
                accessibilityRole="image"
                accessibilityLabel={`${cap.name} capacity${selected && fed ? `, strengthened by ${ACTION_SHORT[selected]}` : ''}`}
                style={[
                  styles.capNode,
                  { left: pos.x - 34, top: pos.y - 34, borderColor: hue, opacity: dim ? 0.4 : 1 },
                  fed && { borderWidth: 5 },
                ]}
              >
                {fed && <View style={[styles.fedDot, { backgroundColor: hue }]} />}
                <Text style={[styles.capName, { color: INK }]} numberOfLines={1}>
                  {cap.name}
                </Text>
              </View>
            );
          })}

          {/* Action nodes (interactive) */}
          {DISPLAY_ACTIONS.map((actionId) => {
            const pos = ACTION_POS[actionId]!;
            const isSel = selected === actionId;
            const dim = selected !== null && !isSel;
            const caps = capacitiesForAction(actionId)
              .map((c) => getCapacity(c).name)
              .join(', ');
            return (
              <Pressable
                key={actionId}
                onPress={() => setSelected(isSel ? null : actionId)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={`${ACTION_SHORT[actionId]} — strengthens ${caps}`}
                style={[
                  styles.actionNode,
                  { left: pos.x - 42, top: pos.y - 22, opacity: dim ? 0.5 : 1 },
                  isSel && styles.actionNodeSel,
                ]}
              >
                <Text style={[styles.actionText, isSel && styles.actionTextSel]} numberOfLines={1}>
                  {ACTION_SHORT[actionId]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.footnote} accessibilityLiveRegion="polite">
        {selected
          ? `${ACTION_SHORT[selected]} strengthens ${capacitiesForAction(selected)
              .map((c) => getCapacity(c).name)
              .join(', ')}.`
          : 'Thicker lines mean a stronger effect.'}
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', paddingVertical: spacing.sm },
  back: { ...typography.body, color: INK, fontWeight: '600' },
  title: { ...typography.heading, color: INK, textAlign: 'center' },
  helper: { ...typography.body, color: '#5A5A72', textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  capNode: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  fedDot: { width: 8, height: 8, borderRadius: 4 },
  capName: { ...typography.caption, fontWeight: '700' },
  actionNode: {
    position: 'absolute',
    width: 84,
    minHeight: 44,
    borderRadius: radii.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E6E0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  actionNodeSel: { borderColor: '#6C4CF1', borderWidth: 3, transform: [{ scale: 1.06 }] },
  actionText: { ...typography.caption, color: INK, fontWeight: '700', textAlign: 'center' },
  actionTextSel: { color: '#4A32B0' },
  footnote: { ...typography.body, color: '#5A5A72', textAlign: 'center', paddingVertical: spacing.lg },
});
