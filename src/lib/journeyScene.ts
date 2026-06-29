/**
 * Pure helpers for the post-battle "journey" metaphor — which scene a habit shows
 * (mountain vs forest) and where the traveler sits along the trail for a given
 * progress %. No I/O; unit-tested. The visual lives in JourneyScene.tsx.
 */
import type { QuestCategory } from '@/types';

export type JourneyScene = 'mountain' | 'forest';

/**
 * Deterministic metaphor per life-area: achievement-flavoured areas climb a
 * mountain; reflective/relational ones find their way out of a forest.
 */
export function sceneForCategory(category?: QuestCategory): JourneyScene {
  switch (category) {
    case 'fitness':
    case 'productivity':
    case 'finance':
      return 'mountain';
    case 'mind':
    case 'health':
    case 'relationships':
    case 'learning':
    case 'creativity':
      return 'forest';
    default:
      return 'mountain';
  }
}

/** A trail as waypoints in a 0–100 viewBox (bottom-left → top-right summit/clearing). */
const TRAIL: readonly { x: number; y: number }[] = [
  { x: 10, y: 88 },
  { x: 34, y: 70 },
  { x: 30, y: 50 },
  { x: 56, y: 40 },
  { x: 52, y: 24 },
  { x: 80, y: 14 },
];

/** The marker position (0–100 coords) at fraction p (0..1) along the trail. */
export function trailPointAt(p: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, p));
  if (t <= 0) return { ...TRAIL[0]! };
  if (t >= 1) return { ...TRAIL[TRAIL.length - 1]! };
  const segs = TRAIL.length - 1;
  const scaled = t * segs;
  const i = Math.min(segs - 1, Math.floor(scaled));
  const local = scaled - i;
  const a = TRAIL[i]!;
  const b = TRAIL[i + 1]!;
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

/** The trail polyline as an SVG points string (for the path backdrop). */
export const TRAIL_POINTS = TRAIL.map((pt) => `${pt.x},${pt.y}`).join(' ');

/** The traveled portion (start → marker at fraction p) as an SVG points string. */
export function traveledPointsAt(p: number): string {
  const t = Math.max(0, Math.min(1, p));
  const segs = TRAIL.length - 1;
  const i = Math.min(segs, Math.floor(t * segs));
  const pts = TRAIL.slice(0, i + 1).map((pt) => `${pt.x},${pt.y}`);
  const m = trailPointAt(t);
  pts.push(`${m.x},${m.y}`);
  return pts.join(' ');
}
