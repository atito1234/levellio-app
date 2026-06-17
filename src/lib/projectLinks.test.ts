import {
  habitsForProject,
  isLinked,
  linkHabit,
  linkedProjectIds,
  normalizeLinks,
  unlinkHabit,
  unlinkProject,
} from './projectLinks';

describe('projectLinks', () => {
  it('links a habit to multiple projects, idempotently', () => {
    let links = {};
    links = linkHabit(links, 'q1', 'p1');
    links = linkHabit(links, 'q1', 'p2');
    links = linkHabit(links, 'q1', 'p1'); // dup ignored
    expect(linkedProjectIds(links, 'q1').sort()).toEqual(['p1', 'p2']);
    expect(isLinked(links, 'q1', 'p2')).toBe(true);
    expect(isLinked(links, 'q9', 'p2')).toBe(false);
  });

  it('unlinks and drops empty keys', () => {
    let links = linkHabit(linkHabit({}, 'q1', 'p1'), 'q1', 'p2');
    links = unlinkHabit(links, 'q1', 'p1');
    expect(linkedProjectIds(links, 'q1')).toEqual(['p2']);
    links = unlinkHabit(links, 'q1', 'p2');
    expect(links).toEqual({});
  });

  it('lists the habits feeding a project', () => {
    let links = linkHabit({}, 'q1', 'p1');
    links = linkHabit(links, 'q2', 'p1');
    links = linkHabit(links, 'q3', 'p2');
    expect(habitsForProject(links, 'p1').sort()).toEqual(['q1', 'q2']);
  });

  it('removes all links to a project on leave', () => {
    let links = linkHabit({}, 'q1', 'p1');
    links = linkHabit(links, 'q1', 'p2');
    links = linkHabit(links, 'q2', 'p1');
    expect(unlinkProject(links, 'p1')).toEqual({ q1: ['p2'] });
  });

  it('normalizes persisted blobs', () => {
    expect(normalizeLinks({ links: { q1: ['p1', 'p1', 2, 'p2'], q2: [], q3: 'x' } })).toEqual({
      q1: ['p1', 'p2'],
    });
    expect(normalizeLinks(null)).toEqual({});
  });
});
