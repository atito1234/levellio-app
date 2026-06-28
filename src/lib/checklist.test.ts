import {
  checkOutChecklist,
  checklistProgress,
  isItemDone,
  rolloverChecklist,
  toggleChecklistItem,
  type Checklist,
} from './checklist';

describe('isItemDone', () => {
  it('text items use the daily checked list', () => {
    expect(isItemDone({ id: 'a', label: 'x' }, ['a'], new Set())).toBe(true);
    expect(isItemDone({ id: 'b', label: 'y' }, ['a'], new Set())).toBe(false);
  });
  it('linked items derive from the quest done-today set (not checkedItemIds)', () => {
    const linked = { id: 'i1', label: 'Walk', questId: 'q1' };
    expect(isItemDone(linked, [], new Set(['q1']))).toBe(true);
    expect(isItemDone(linked, ['i1'], new Set())).toBe(false); // ticking the item id doesn't count
  });
});

describe('checklistProgress with linked items', () => {
  it('counts a linked item as done when its quest is done today', () => {
    const c: Checklist = {
      id: 'c', title: 'AM', emoji: '🌅', colorId: 'violet',
      items: [{ id: 'i1', label: 'Walk', questId: 'q1' }, { id: 'i2', label: 'Water' }],
      recurring: true, createdAt: 0, order: 0, checkedItemIds: [], checkoutStreak: 0,
    };
    expect(checklistProgress(c, new Set(['q1'])).done).toBe(1);
    expect(checklistProgress({ ...c, checkedItemIds: ['i2'] }, new Set(['q1'])).complete).toBe(true);
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

  it('rolloverChecklist resets stale day ticks', () => {
    const c = make({ checkedItemIds: ['a'], checkedDay: '2026-01-01' });
    expect(rolloverChecklist(c, '2026-01-02').checkedItemIds).toEqual([]);
    expect(rolloverChecklist(c, '2026-01-01')).toBe(c); // same day → unchanged ref
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
