/**
 * Activity timing model — pure helpers. An activity is "timed" when its title
 * implies a duration (e.g. "20-minute workout", "Meditate for 10 minutes"); we
 * then run a countdown ("alarm clock"). Otherwise it's open-ended and we offer a
 * Pomodoro focus session. No I/O.
 */
import type { Quest } from '@/types';

/** Default Pomodoro focus length (minutes) for open-ended activities. */
export const POMODORO_MINUTES = 25;

/**
 * Fraction of a timed activity's target that must actually elapse in-app for the
 * completion to count as "verified" (vs a self-reported manual log). A small
 * tolerance below 100% absorbs the user tapping finish a beat early.
 */
export const VERIFY_RATIO = 0.9;

/**
 * Whether a completion is "verified": the real elapsed time met the bar for the
 * activity's target. `targetSec <= 0` (open-ended) verifies on any real elapsed
 * time. Pure + deterministic.
 */
export function isVerifiedDuration(durationSec: number, targetSec: number): boolean {
  if (durationSec <= 0) return false;
  if (targetSec <= 0) return durationSec > 0;
  return durationSec >= Math.floor(targetSec * VERIFY_RATIO);
}

/** Parse an implied duration (minutes) from an activity title, or null. */
export function parseDurationMinutes(title: string): number | null {
  const t = title.toLowerCase();
  const hour = /(\d+)\s*-?\s*(?:hours?|hrs?)\b/.exec(t);
  if (hour) return Math.max(1, parseInt(hour[1]!, 10) * 60);
  const min = /(\d+)\s*-?\s*min(?:ute)?s?\b/.exec(t);
  if (min) return Math.max(1, parseInt(min[1]!, 10));
  return null;
}

export interface ActivityTiming {
  /** True when the activity has an implied duration to count down. */
  timed: boolean;
  /** Minutes to run: the parsed duration, or the Pomodoro default when open-ended. */
  minutes: number;
  /** 'timer' for a fixed-duration activity, 'pomodoro' for an open-ended one. */
  method: 'timer' | 'pomodoro';
}

/** Resolve how an activity should be timed. */
export function activityTiming(quest: Pick<Quest, 'title'>): ActivityTiming {
  const parsed = parseDurationMinutes(quest.title);
  return parsed != null
    ? { timed: true, minutes: parsed, method: 'timer' }
    : { timed: false, minutes: POMODORO_MINUTES, method: 'pomodoro' };
}

/** Format seconds as M:SS (or H:MM:SS for long sessions). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? `${m}`.padStart(2, '0') : `${m}`;
  const ss = `${sec}`.padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
