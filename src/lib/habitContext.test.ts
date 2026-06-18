import { habitContext } from './habitContext';
import { habitScience } from '@/data/habitScience';
import type { Goal } from './goal';
import type { Quest } from '@/types';

const q = (title: string, category: Quest['category'] = 'mind'): Pick<Quest, 'title' | 'category'> => ({ title, category });
const goal = (title: string, categories: Quest['category'][]): Goal => ({
  id: title,
  title,
  emoji: '🎯',
  colorId: 'violet',
  categories,
  createdAt: 0,
  order: 0,
  kind: 'personal',
});

describe('habitScience', () => {
  it('matches a keyword over the category', () => {
    expect(habitScience(q('Meditate for 10 minutes')).phrase).toBe('meditating');
    expect(habitScience(q('Drink a glass of water', 'health')).phrase).toBe('drinking water');
  });

  it('falls back to the category, using the title when phrase is generic', () => {
    const s = habitScience(q('Review the budget', 'finance'));
    expect(s.phrase).toBe('review the budget');
    expect(s.science.length).toBeGreaterThan(0);
  });
});

describe('habitContext', () => {
  it('builds a specific prompt for the habit', () => {
    expect(habitContext(q('Meditate for 10 minutes'), []).prompt).toBe('What’s stopping you from meditating right now?');
  });

  it('weaves in the matching goal when one applies', () => {
    const ctx = habitContext(q('Meditate for 10 minutes', 'mind'), [goal('Lower my stress', ['mind', 'health'])]);
    expect(ctx.goalTitle).toBe('Lower my stress');
    expect(ctx.teaching).toContain('Lower my stress');
  });

  it('omits a goal honestly when none matches', () => {
    const ctx = habitContext(q('Meditate', 'mind'), [goal('Get fit', ['fitness'])]);
    expect(ctx.goalTitle).toBeUndefined();
    expect(ctx.teaching).not.toContain('Get fit');
  });
});
