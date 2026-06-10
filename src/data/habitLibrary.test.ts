import {
  HABIT_LIBRARY,
  libraryByCategory,
  libraryHabitToQuest,
} from './habitLibrary';
import { CATEGORY_ORDER } from '@/lib/categories';
import { QUEST_XP } from '@/lib/leveling';

describe('habit library data integrity', () => {
  it('is meaningfully broad', () => {
    expect(HABIT_LIBRARY.length).toBeGreaterThanOrEqual(25);
  });

  it('has unique ids', () => {
    const ids = HABIT_LIBRARY.map((h) => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only valid categories and difficulties', () => {
    for (const h of HABIT_LIBRARY) {
      expect(CATEGORY_ORDER).toContain(h.category);
      expect(['easy', 'medium', 'hard']).toContain(h.difficulty);
      expect(h.title.trim().length).toBeGreaterThan(0);
    }
  });

  it('covers every category with at least 3 habits', () => {
    for (const category of CATEGORY_ORDER) {
      expect(HABIT_LIBRARY.filter((h) => h.category === category).length).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('libraryByCategory', () => {
  it('returns non-empty sections in category order', () => {
    const sections = libraryByCategory();
    expect(sections.length).toBe(CATEGORY_ORDER.length);
    expect(sections[0]?.category).toBe(CATEGORY_ORDER[0]);
    sections.forEach((s) => expect(s.habits.length).toBeGreaterThan(0));
  });
});

describe('libraryHabitToQuest', () => {
  it('maps a habit to a quest with correct base XP', () => {
    const habit = HABIT_LIBRARY.find((h) => h.difficulty === 'hard');
    expect(habit).toBeDefined();
    const quest = libraryHabitToQuest(habit!, 'lib-1');
    expect(quest.baseXp).toBe(QUEST_XP.hard);
    expect(quest.completed).toBe(false);
    expect(quest.id).toBe('lib-1');
  });
});
