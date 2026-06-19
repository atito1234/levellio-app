import { normalizeText, rankByQuery, searchHabits, searchPeople, searchProjects, textMatches } from './discovery';

describe('normalizeText', () => {
  it('lowercases, trims, and strips diacritics', () => {
    expect(normalizeText('  Réseau ')).toBe('reseau');
    expect(normalizeText('Água')).toBe('agua');
  });
});

describe('textMatches', () => {
  it('matches accent-insensitively; empty query matches all', () => {
    expect(textMatches('Clean Water', 'water')).toBe(true);
    expect(textMatches('réseau', 'reseau')).toBe(true);
    expect(textMatches('anything', '')).toBe(true);
    expect(textMatches('abc', 'z')).toBe(false);
  });
});

describe('rankByQuery', () => {
  it('returns prefix hits before substring hits, stable otherwise', () => {
    const items = ['running', 'morning run', 'rest'];
    expect(rankByQuery(items, 'run', (x) => x)).toEqual(['running', 'morning run']);
  });
  it('returns a copy of all items for an empty query', () => {
    const items = ['a', 'b'];
    expect(rankByQuery(items, '  ', (x) => x)).toEqual(items);
  });
});

describe('searchHabits', () => {
  const habits = [
    { title: 'Drink water', description: 'hydrate', category: 'health' },
    { title: 'Run', description: 'cardio', category: 'fitness' },
    { title: 'Walk', description: 'steps', category: 'fitness' },
  ];
  it('filters by category then ranks by query', () => {
    expect(searchHabits(habits, '', 'fitness').map((h) => h.title)).toEqual(['Run', 'Walk']);
    expect(searchHabits(habits, 'wal', 'fitness').map((h) => h.title)).toEqual(['Walk']);
  });
  it('matches the description too', () => {
    expect(searchHabits(habits, 'hydrate').map((h) => h.title)).toEqual(['Drink water']);
  });
});

describe('searchProjects', () => {
  const projects = [
    { title: 'Clean Water', summary: 'wells', region: 'Fort-Liberté' },
    { title: 'Gardens', summary: 'food', region: 'Mexico' },
  ];
  it('matches title, summary, or region', () => {
    expect(searchProjects(projects, 'wells').map((p) => p.title)).toEqual(['Clean Water']);
    expect(searchProjects(projects, 'mexico').map((p) => p.title)).toEqual(['Gardens']);
  });
});

describe('searchPeople', () => {
  it('ranks prefix matches first', () => {
    const people = [{ displayName: 'Bobby' }, { displayName: 'Abob' }];
    expect(searchPeople(people, 'bob').map((p) => p.displayName)).toEqual(['Bobby', 'Abob']);
  });
});
