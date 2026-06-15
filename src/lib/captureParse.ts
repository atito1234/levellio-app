/**
 * On-device capture parsing — turn one free-text (typed or dictated via the phone
 * keyboard mic) into structured habits. No network, no native deps: a
 * deterministic heuristic parser. Honest by design — it only extracts what's
 * actually in the text. A cloud parser can later augment this behind the same
 * shape without changing callers.
 *
 *   "walk 20 min after lunch, drink water, no soda at 7pm"
 *     -> [ {title:'Walk 20 min', category:'fitness', difficulty:'medium', scheduledTime:780},
 *          {title:'Drink water',  category:'health',  difficulty:'easy'},
 *          {title:'No soda',      category:'health',  difficulty:'easy', scheduledTime:1140} ]
 */
import { normalizeTitle, TITLE_MAX } from './questForm';
import { clampScheduleMinutes } from './schedule';
import type { QuestCategory, QuestDifficulty } from '@/types';

export interface ParsedHabit {
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  scheduledTime?: number;
}

/** Max habits extracted from a single capture (guards runaway input). */
export const MAX_CAPTURE_ITEMS = 12;

// Keyword → category. First match wins, in this order.
const CATEGORY_KEYWORDS: ReadonlyArray<[QuestCategory, readonly string[]]> = [
  ['fitness', ['walk', 'run', 'jog', 'gym', 'workout', 'exercise', 'steps', 'stretch', 'yoga', 'swim', 'cycle', 'bike', 'lift', 'pushup', 'push-up', 'cardio', 'hiit', '5k', '10k']],
  ['health', ['water', 'sleep', 'bed', 'veg', 'veggie', 'salad', 'fruit', 'sugar', 'soda', 'snack', 'eat', 'meal', 'diet', 'protein', 'vitamin', 'sunlight', 'hydrate', 'fast', 'breakfast', 'lunch', 'dinner']],
  ['mind', ['meditate', 'meditation', 'breathe', 'breathing', 'journal', 'gratitude', 'mindful', 'relax', 'screen', 'phone-free']],
  ['learning', ['read', 'study', 'learn', 'course', 'lesson', 'language', 'practice', 'book', 'pages']],
  ['relationships', ['call', 'text', 'message', 'wife', 'husband', 'partner', 'kids', 'family', 'friend', 'date', 'mom', 'dad']],
  ['finance', ['budget', 'save', 'savings', 'spend', 'spending', 'expense', 'invest', 'money', 'bill']],
  ['creativity', ['write', 'writing', 'draw', 'sketch', 'paint', 'music', 'guitar', 'piano', 'create', 'design']],
  ['productivity', ['work', 'task', 'email', 'inbox', 'plan', 'tidy', 'clean', 'focus', 'deep work', 'project', 'review']],
];

const DAYPART_MINUTES: ReadonlyArray<[RegExp, number]> = [
  [/\bbefore bed\b|\bbedtime\b/i, 22 * 60],
  [/\bafter lunch\b/i, 13 * 60],
  [/\bafter work\b/i, 18 * 60],
  [/\bmorning\b/i, 8 * 60],
  [/\bnoon\b|\bmidday\b/i, 12 * 60],
  [/\bafternoon\b/i, 15 * 60],
  [/\bevening\b/i, 18 * 60],
  [/\bnight\b/i, 21 * 60],
];

/** Extract a clock or day-part time (minutes since midnight) + the matched text to strip. */
function extractTime(text: string): { minutes?: number; matched?: string } {
  // 12-hour clock: "7am", "at 7:30 pm", "@ 9 am"
  const clock = text.match(/\b(?:at|by|@)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (clock) {
    let h = parseInt(clock[1]!, 10) % 12;
    if (clock[3]!.toLowerCase() === 'pm') h += 12;
    const m = clock[2] ? parseInt(clock[2], 10) : 0;
    return { minutes: clampScheduleMinutes(h * 60 + m), matched: clock[0] };
  }
  // 24-hour clock, only with an explicit "at/by" so "20 min" can't match.
  const h24 = text.match(/\b(?:at|by)\s+(\d{1,2}):(\d{2})\b/i);
  if (h24) {
    return { minutes: clampScheduleMinutes(parseInt(h24[1]!, 10) * 60 + parseInt(h24[2]!, 10)), matched: h24[0] };
  }
  for (const [re, minutes] of DAYPART_MINUTES) {
    const m = text.match(re);
    if (m) return { minutes, matched: m[0] };
  }
  return {};
}

/** Total minutes of any explicit duration ("20 min", "1 hour"), or 0. */
function extractDurationMinutes(text: string): number {
  const m = text.match(/(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/i);
  if (!m) return 0;
  const n = parseInt(m[1]!, 10);
  return /^h/i.test(m[2]!) ? n * 60 : n;
}

function categoryFor(text: string): QuestCategory {
  const lower = text.toLowerCase();
  for (const [category, words] of CATEGORY_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return category;
  }
  return 'health'; // honest default for a wellness app
}

function difficultyFor(text: string, durationMin: number): QuestDifficulty {
  if (durationMin >= 45 || /\b(run|5k|10k|marathon|gym|hiit)\b/i.test(text)) return 'hard';
  if (durationMin >= 15 || /\b(workout|jog|swim|cycle|study|deep work)\b/i.test(text)) return 'medium';
  return 'easy';
}

function cleanTitle(raw: string, timeMatch?: string): string {
  let t = raw;
  if (timeMatch) t = t.replace(timeMatch, ' ');
  t = t
    .replace(/^[\s\-•*\d.)]+/, '') // leading bullets / numbering
    .replace(/\b(at|by|@|after|before|then)\s*$/i, '') // dangling connectors
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,;:.]+$/, '')
    .trim();
  if (t.length === 0) return '';
  const titled = t.charAt(0).toUpperCase() + t.slice(1);
  return titled.slice(0, TITLE_MAX);
}

/** Parse a free-text capture into a deduped list of structured habits. */
export function parseCapture(input: string): ParsedHabit[] {
  if (!input || input.trim().length === 0) return [];
  const segments = input
    .split(/[\n,;]+|\s+(?:and|then)\s+|\s*&\s*/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const out: ParsedHabit[] = [];
  const seen = new Set<string>();
  for (const seg of segments) {
    const { minutes, matched } = extractTime(seg);
    const title = cleanTitle(seg, matched);
    if (title.length === 0) continue;
    const key = normalizeTitle(title);
    if (seen.has(key)) continue;
    seen.add(key);

    const duration = extractDurationMinutes(seg);
    out.push({
      title,
      category: categoryFor(seg),
      difficulty: difficultyFor(seg, duration),
      ...(minutes !== undefined ? { scheduledTime: minutes } : {}),
    });
    if (out.length >= MAX_CAPTURE_ITEMS) break;
  }
  return out;
}
