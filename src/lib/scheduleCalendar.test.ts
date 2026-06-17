import { dayCategoryColors, daySchedule, dominantColor } from './scheduleCalendar';
import { CATEGORY_COLOR } from './categories';
import type { Quest } from '@/types';

function quest(p: Partial<Quest>): Quest {
  return {
    id: p.id ?? 'q',
    title: p.title ?? 'Habit',
    category: p.category ?? 'fitness',
    difficulty: 'easy',
    baseXp: 10,
    completed: false,
    scheduledDays: p.scheduledDays,
    ...p,
  } as Quest;
}

// 2026-06-15 is a Monday (weekday 1).
const MON = '2026-06-15';

describe('daySchedule', () => {
  const run = quest({ id: 'run', category: 'fitness', scheduledDays: [1, 3] });
  const read = quest({ id: 'read', category: 'learning', scheduledDays: [2] });
  const quests = [run, read];

  it('uses the explicit plan when one is set', () => {
    const s = daySchedule(MON, quests, ['read'], new Set());
    expect(s.scheduled.map((q) => q.id)).toEqual(['read']);
    expect(s.categories).toEqual(['learning']);
    expect(s.count).toBe(1);
  });

  it('falls back to weekday recurrence when no plan exists', () => {
    const s = daySchedule(MON, quests, undefined, new Set());
    expect(s.scheduled.map((q) => q.id)).toEqual(['run']); // recurs Mon
    expect(s.categories).toEqual(['fitness']);
  });

  it('tracks done ids within the scheduled set and orders categories canonically', () => {
    const s = daySchedule(MON, quests, ['read', 'run'], new Set(['run']));
    expect(s.doneIds).toEqual(new Set(['run']));
    expect(s.doneCount).toBe(1);
    expect(s.categories).toEqual(['fitness', 'learning']); // CATEGORY_ORDER
  });

  it('includes categories of things done even if not scheduled', () => {
    const s = daySchedule(MON, quests, [], new Set(['read']));
    expect(s.categories).toEqual(['learning']);
  });
});

describe('dayCategoryColors / dominantColor', () => {
  it('maps categories to colours, capped', () => {
    expect(dayCategoryColors(['fitness', 'learning', 'mind', 'health'], 3)).toEqual([
      CATEGORY_COLOR.fitness,
      CATEGORY_COLOR.learning,
      CATEGORY_COLOR.mind,
    ]);
  });
  it('returns the first category colour, or undefined when empty', () => {
    expect(dominantColor(['mind'])).toBe(CATEGORY_COLOR.mind);
    expect(dominantColor([])).toBeUndefined();
  });
});
