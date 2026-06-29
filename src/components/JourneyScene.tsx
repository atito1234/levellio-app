/**
 * JourneyScene — a small mountain-climb / forest-path graphic that frames a battle
 * win as progress toward an AUTOMATIC habit. The traveler sits at the primary
 * habit's days-to-automatic (journey.ts progressPct); ticks mark Day 21 (locked in)
 * and Day 66 (automatic); a 🔥 flame badge shows the per-dragon streak. Pure visual.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline } from 'react-native-svg';
import { colors, radii, spacing, typography } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { SOLIDIFY_DAYS } from '@/lib/activityStreak';
import { HABIT_DAYS } from '@/lib/journey';
import { TRAIL_POINTS, trailPointAt, traveledPointsAt, type JourneyScene as Scene } from '@/lib/journeyScene';

const MOUNT = '#9CA3AF';
const FOREST = '#3F8A4E';
const SKY = '#EEF4FB';
const TRACK = '#D8D5CE';

export function JourneyScene({
  scene,
  progressPct,
  streak = 0,
  graduated = false,
  height = 150,
}: {
  scene: Scene;
  progressPct: number; // 0–100 toward automatic
  streak?: number; // per-dragon day streak (flame badge)
  graduated?: boolean;
  height?: number;
}) {
  const reduced = useReducedMotion();
  const target = Math.max(0, Math.min(1, progressPct / 100));
  const [frac, setFrac] = useState(reduced ? target : 0);
  const anim = useRef(new Animated.Value(reduced ? target : 0)).current;

  useEffect(() => {
    if (reduced) {
      setFrac(target);
      return;
    }
    const id = anim.addListener(({ value }) => setFrac(value));
    Animated.timing(anim, { toValue: target, duration: 900, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [target, reduced, anim]);

  const marker = trailPointAt(frac);
  const lockIn = trailPointAt(SOLIDIFY_DAYS / HABIT_DAYS); // Day 21
  const summit = trailPointAt(1); // Day 66
  const accent = colors.violetDeep;
  const traveled = traveledPointsAt(frac);

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Sky */}
        <Polygon points="0,0 100,0 100,100 0,100" fill={SKY} />
        {scene === 'mountain' ? (
          <>
            <Polygon points="0,100 38,42 64,72 100,30 100,100" fill={MOUNT} opacity={0.35} />
            <Polygon points="46,38 64,72 82,40" fill="#FFFFFF" opacity={0.6} />
          </>
        ) : (
          <>
            {/* A few stylized trees, denser at the start of the path. */}
            {[
              { x: 14, y: 86 }, { x: 24, y: 92 }, { x: 8, y: 72 }, { x: 30, y: 64 },
              { x: 20, y: 50 }, { x: 42, y: 56 },
            ].map((tr, i) => (
              <Polygon key={i} points={`${tr.x},${tr.y} ${tr.x - 6},${tr.y + 14} ${tr.x + 6},${tr.y + 14}`} fill={FOREST} opacity={0.4} />
            ))}
            {/* Sunlit clearing at the summit/end. */}
            <Circle cx={summit.x} cy={summit.y - 4} r={7} fill="#FFE08A" opacity={0.85} />
          </>
        )}

        {/* Full trail (muted) + traveled portion (accent). */}
        <Polyline points={TRAIL_POINTS} fill="none" stroke={TRACK} strokeWidth={2.4} strokeDasharray="3,3" strokeLinecap="round" />
        <Polyline points={traveled} fill="none" stroke={accent} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />

        {/* Milestone ticks: Day 21 (locked in) and Day 66 (automatic). */}
        <Line x1={lockIn.x} y1={lockIn.y - 4} x2={lockIn.x} y2={lockIn.y + 4} stroke={colors.teal} strokeWidth={1.6} />
        <Circle cx={summit.x} cy={summit.y} r={3} fill={graduated ? '#FFB23E' : TRACK} />
      </Svg>

      {/* Traveler marker (emoji) positioned along the trail. */}
      <Text style={[styles.marker, { left: `${marker.x}%`, top: `${marker.y}%` }]} accessibilityElementsHidden>
        {scene === 'mountain' ? '🧗' : '🚶'}
      </Text>
      {/* Summit goal marker. */}
      <Text style={[styles.summit, { left: `${summit.x}%`, top: `${summit.y}%` }]} accessibilityElementsHidden>
        {graduated ? '🏁' : '⛰️'}
      </Text>

      {/* Flame badge — the per-dragon streak (layered second metric). */}
      {streak > 0 && (
        <View style={styles.flame}>
          <Text style={styles.flameText}>🔥 {streak}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: radii.lg, overflow: 'hidden', backgroundColor: SKY },
  // Emoji markers are ~20px; nudge up/left so they center on the trail point.
  marker: { position: 'absolute', fontSize: 22, marginLeft: -11, marginTop: -16 },
  summit: { position: 'absolute', fontSize: 18, marginLeft: -9, marginTop: -20 },
  flame: { position: 'absolute', top: spacing.sm, right: spacing.sm, backgroundColor: '#FFF7E6', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: '#F6E2B0' },
  flameText: { ...typography.caption, color: '#8A5A0A', fontWeight: '800' },
});
