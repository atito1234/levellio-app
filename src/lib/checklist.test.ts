import {
  checkOutChecklist,
  checklistDayState,
  checklistProgress,
  isItemDone,
  rolloverChecklist,
  toggleChecklistItem,
  type Checklist,
} from './checklist';

describe('isItemDone', () => {
  it('uses the checklist\'s own ticks for every item (linked or text)', () => {
    expect(isItemDone({ id: 'a', label: 'x' }, ['a'])).toBe(true);
    expect(isItemDone({ id: 'b', label: 'y' }, ['a'])).toBe(false);
    // A linked item is NOT auto-done just because its quest was completed elsewhere.
    expect(isItemDone({ id: 'i1', label: 'Walk', questId: 'q1' }, [])).toBe(false);
    expect(isItemDone({ id: 'i1', label: 'Walk', questId: 'q1' }, ['i1'])).toBe(true);
  });
});

describe('checklistDayState', () => {
  it('routine/undated lists are always today-scoped', () => {
    expect(checklistDayState(make(), '2026-06-28')).toBe('today');
  });
  it('dated lists report past / today / future', () => {
    expect(checklistDayState(make({ recurring: false, date: '2026-06-28' }), '2026-06-28')).toBe('today');
    expect(checklistDayState(make({ recurring: false, date: '2026-06-27' }), '2026-06-28')).toBe('past');
    expect(checklistDayState(make({ recurring: false, date: '2026-07-01' }), '2026-06-28')).toBe('future');
  });
});

function make(over: Partial<Checklist> = {}): Checklist {
  return {
    id: 'c1',
    title: 'Morning',
    emoji: '🌅',
    colorId: 'violet',
    items: [
      { id: 'a', label: 'Water' },
      { id: 'b', label: 'Stretch' },
    ],
    recurring: true,
    createdAt: 0,
    order: 0,
    checkedItemIds: [],
    checkoutStreak: 0,
    ...over,
  };
}

describe('checklistProgress', () => {
  it('counts ticked items and completeness', () => {
    expect(checklistProgress(make())).toEqual({ done: 0, total: 2, pct: 0, complete: false });
    expect(checklistProgress(make({ checkedItemIds: ['a'], checkedDay: 'd' }))).toEqual({ done: 1, total: 2, pct: 50, complete: false });
    expect(checklistProgress(make({ checkedItemIds: ['a', 'b'], checkedDay: 'd' })).complete).toBe(true);
  });

  it('ignores stale ticks for items that no longer exist', () => {
    expect(checklistProgress(make({ checkedItemIds: ['a', 'gone'], checkedDay: 'd' })).done).toBe(1);
  });
});

describe('toggle + rollover', () => {
  it('toggles an item on and off for today', () => {
    const on = toggleChecklistItem(make(), 'a', '2026-01-01');
    expect(on.checkedItemIds).toEqual(['a']);
    expect(on.checkedDay).toBe('2026-01-01');
    const off = toggleChecklistItem(on, 'a', '2026-01-01');
    expect(off.checkedItemIds).toEqual([]);
  });

  it('clears yesterday’s ticks when toggling on a new day', () => {
    const yest = make({ checkedItemIds: ['a', 'b'], checkedDay: '2026-01-01' });
    const today = toggleChecklistItem(yest, 'a', '2026-01-02');
    expect(today.checkedItemIds).toEqual(['a']); // b cleared by rollover, a freshly ticked
  });

  it('rolloverChecklist resets stale day ticks for routine lists', () => {
    const c = make({ checkedItemIds: ['a'], checkedDay: '2026-01-01' });
    expect(rolloverChecklist(c, '2026-01-02').checkedItemIds).toEqual([]);
    expect(rolloverChecklist(c, '2026-01-01')).toBe(c); // same day → unchanged ref
  });

  it('does NOT roll over a dated list (its ticks are a record for that day)', () => {
    const dated = make({ recurring: false, date: '2026-01-01', checkedItemIds: ['a'], checkedDay: '2026-01-01' });
    expect(rolloverChecklist(dated, '2026-01-02')).toBe(dated); // unchanged
  });
});

describe('checkOutChecklist', () => {
  it('starts a streak and resets a recurring list', () => {
    const r = checkOutChecklist(make({ checkedItemIds: ['a', 'b'], checkedDay: '2026-01-01' }), new Date('2026-01-01T12:00:00'));
    expect(r.streak).toBe(1);
    expect(r.checklist.checkedItemIds).toEqual([]);
    expect(r.checklist.archived).toBeUndefined();
  });

  it('extends the streak on consecutive days', () => {
    const day1 = checkOutChecklist(make(), new Date('2026-01-01T12:00:00')).checklist;
    const day2 = checkOutChecklist(day1, new Date('2026-01-02T12:00:00'));
    expect(day2.streak).toBe(2);
  });

  it('is a no-op when already checked out today', () => {
    const day1 = checkOutChecklist(make(), new Date('2026-01-01T08:00:00')).checklist;
    const again = checkOutChecklist(day1, new Date('2026-01-01T20:00:00'));
    expect(again.alreadyDoneToday).toBe(true);
    expect(again.streak).toBe(1);
  });

  it('archives a one-off list on check-out', () => {
    const r = checkOutChecklist(make({ recurring: false }), new Date('2026-01-01T12:00:00'));
    expect(r.checklist.archived).toBe(true);
  });
});
