import { nextActivity } from './nextActivity';
import { addLink } from './links';
import type { Goal } from './goal';
import type { Quest } from '@/types';

const q = (id: string, category: Quest['category'], over: Partial<Quest> = {}): Quest => ({
  id,
  title: id,
  category,
  difficulty: 'easy',
  baseXp: 10,
  completed: false,
  ...over,
});

const goal = (id: string, categories: Quest['category'][]): Goal => ({
  id,
  title: id,
  emoji: '🎯',
  colorId: 'violet',
  categories,
  createdAt: 0,
  order: 0,
});

describe('nextActivity', () => {
  const quests = [
    q('done', 'fitness', { completed: true }),
    q('fit2', 'fitness'),
    q('mind1', 'mind'),
    q('learn1', 'learning'),
  ];
  const goals = [goal('g-fit', ['fitness']), goal('g-mind', ['mind', 'learning'])];

  it('prefers an explicitly linked activity (the chain)', () => {
    const links = addLink({}, 'done', 'mind1'); // chain crosses goals
    const s = nextActivity({ justCompletedId: 'done', quests, goals, links });
    expect(s.next?.id).toBe('mind1');
    expect(s.reason).toBe('chain');
  });

  it('falls back to the same goal/category when no link', () => {
    const s = nextActivity({ justCompletedId: 'done', quests, goals, links: {} });
    expect(s.next?.id).toBe('fit2');
    expect(s.reason).toBe('goal');
  });

  it('falls back to anything open across groups', () => {
    const only = [q('done', 'fitness', { completed: true }), q('mind1', 'mind')];
    const s = nextActivity({ justCompletedId: 'done', quests: only, goals, links: {} });
    expect(s.next?.id).toBe('mind1');
    expect(s.reason).toBe('planned');
  });

  it('returns no next when nothing is open', () => {
    const s = nextActivity({ justCompletedId: 'done', quests: [q('done', 'fitness', { completed: true })], goals, links: {} });
    expect(s.next).toBeUndefined();
    expect(s.reason).toBe('none');
  });

  it('lists goals with open activities, busiest first', () => {
    const s = nextActivity({ justCompletedId: 'done', quests, goals, links: {} });
    expect(s.goalChoices.map((c) => c.goal.id)).toEqual(['g-mind', 'g-fit']); // mind+learning=2, fitness=1
  });
});
