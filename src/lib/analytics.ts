/**
 * Activity analytics — pure aggregations over the captured session log, so users
 * can see what's working, when, and for how long. No I/O; operates on the
 * privacy-gated activity_session events already stored on-device.
 */
import { dayKey } from './dates';
import type { ActivitySessionEvent, MetadataEvent } from './metadata';

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Keep only completed-activity sessions. */
export function sessionsOf(events: readonly MetadataEvent[]): ActivitySessionEvent[] {
  return events.filter((e): e is ActivitySessionEvent => e.type === 'activity_session');
}

/** The local day a session belongs to (YYYY-MM-DD). */
export function sessionDay(session: ActivitySessionEvent): string {
  return dayKey(new Date(session.createdAt));
}

export function sessionsForDay(sessions: readonly ActivitySessionEvent[], key: string): ActivitySessionEvent[] {
  return sessions.filter((s) => sessionDay(s) === key);
}

/** The set of activity ids that have at least one session in the given list. */
export function completedActivityIds(sessions: readonly ActivitySessionEvent[]): Set<string> {
  return new Set(sessions.map((s) => s.activityId));
}

export interface Summary {
  count: number;
  totalMin: number;
  /** Average minutes across sessions that were actually timed (>0). Null if none. */
  avgMin: number | null;
  /** Session counts per hour (0-23) and weekday (0=Sun). */
  byHour: number[];
  byWeekday: number[];
  /** The hour / weekday with the most sessions, or null when unknown. */
  bestHour: number | null;
  bestWeekday: number | null;
}

function argmax(counts: number[]): number | null {
  let best = -1;
  let bestVal = 0;
  counts.forEach((v, i) => {
    if (v > bestVal) {
      bestVal = v;
      best = i;
    }
  });
  return best >= 0 ? best : null;
}

/** Summarize a set of sessions (count, time, and time-of-day/weekday patterns). */
export function summarize(sessions: readonly ActivitySessionEvent[]): Summary {
  const byHour = new Array(24).fill(0) as number[];
  const byWeekday = new Array(7).fill(0) as number[];
  let totalSec = 0;
  let timedCount = 0;

  for (const s of sessions) {
    totalSec += s.durationSec;
    if (s.durationSec > 0) timedCount += 1;
    if (typeof s.hourOfDay === 'number') byHour[s.hourOfDay] = (byHour[s.hourOfDay] ?? 0) + 1;
    if (typeof s.weekday === 'number') byWeekday[s.weekday] = (byWeekday[s.weekday] ?? 0) + 1;
  }

  const totalMin = Math.round(totalSec / 60);
  return {
    count: sessions.length,
    totalMin,
    avgMin: timedCount > 0 ? Math.round(totalSec / 60 / timedCount) : null,
    byHour,
    byWeekday,
    bestHour: argmax(byHour),
    bestWeekday: argmax(byWeekday),
  };
}

export interface CategoryStat {
  category: string;
  summary: Summary;
}

/** Per-category summaries, most active first. */
export function byCategory(sessions: readonly ActivitySessionEvent[]): CategoryStat[] {
  const groups = new Map<string, ActivitySessionEvent[]>();
  for (const s of sessions) {
    const c = s.category ?? 'uncategorized';
    (groups.get(c) ?? groups.set(c, []).get(c)!).push(s);
  }
  return [...groups.entries()]
    .map(([category, list]) => ({ category, summary: summarize(list) }))
    .sort((a, b) => b.summary.count - a.summary.count);
}

export interface ActivityStat {
  activityId: string;
  title: string;
  summary: Summary;
}

/** Per-activity summaries, most active first. */
export function byActivity(sessions: readonly ActivitySessionEvent[]): ActivityStat[] {
  const groups = new Map<string, ActivitySessionEvent[]>();
  for (const s of sessions) {
    (groups.get(s.activityId) ?? groups.set(s.activityId, []).get(s.activityId)!).push(s);
  }
  return [...groups.entries()]
    .map(([activityId, list]) => ({
      activityId,
      title: list[list.length - 1]?.title ?? 'Activity',
      summary: summarize(list),
    }))
    .sort((a, b) => b.summary.count - a.summary.count);
}

// --- Labels -----------------------------------------------------------------

export function hourLabel(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${period}`;
}

export function weekdayLabel(d: number): string {
  return WEEKDAY_SHORT[d] ?? '';
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Clock label for a session's completion time, when timestamps are kept. */
export function sessionTimeLabel(session: ActivitySessionEvent): string {
  const d = new Date(session.createdAt);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
