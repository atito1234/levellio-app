import { repointPlanDays, repointAssignments } from './dedupeMigration';

describe('repointPlanDays', () => {
  it('repoints ids to survivors and de-dupes within a day', () => {
    const days = { '2026-06-15': ['a', 'b', 'c'], '2026-06-16': ['a'] };
    const remap = { a: 's', b: 's', c: 'c' }; // a & b merged into s
    expect(repointPlanDays(days, remap)).toEqual({
      '2026-06-15': ['s', 'c'], // a,b collapse to one s, order preserved
      '2026-06-16': ['s'],
    });
  });

  it('leaves unmapped ids untouched', () => {
    expect(repointPlanDays({ d: ['x', 'y'] }, {})).toEqual({ d: ['x', 'y'] });
  });
});

describe('repointAssignments', () => {
  it('repoints activity ids to survivors, first bucket wins on collision', () => {
    const assignments = { a: 'b1', b: 'b2', c: 'b3' };
    const remap = { a: 's', b: 's', c: 'c' };
    expect(repointAssignments(assignments, remap)).toEqual({ s: 'b1', c: 'b3' });
  });
});
