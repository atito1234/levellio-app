import {
  validateQuestDraft,
  draftToQuest,
  findDuplicateActivity,
  normalizeTitle,
  TITLE_MAX,
  DESCRIPTION_MAX,
} from './questForm';
import type { QuestDraft } from './questForm';
import type { Quest } from '@/types';

const base: QuestDraft = { title: 'Read a book', category: 'learning', difficulty: 'medium' };

describe('validateQuestDraft', () => {
  it('accepts a well-formed draft', () => {
    expect(validateQuestDraft(base).valid).toBe(true);
  });

  it('rejects an empty or whitespace-only title', () => {
    expect(validateQuestDraft({ ...base, title: '' }).errors.title).toBeDefined();
    expect(validateQuestDraft({ ...base, title: '   ' }).errors.title).toBeDefined();
  });

  it('rejects an over-long title', () => {
    const long = 'x'.repeat(TITLE_MAX + 1);
    expect(validateQuestDraft({ ...base, title: long }).valid).toBe(false);
  });

  it('rejects an over-long description but allows a normal one', () => {
    expect(validateQuestDraft({ ...base, description: 'ok' }).valid).toBe(true);
    const long = 'y'.repeat(DESCRIPTION_MAX + 1);
    expect(validateQuestDraft({ ...base, description: long }).errors.description).toBeDefined();
  });
});

describe('draftToQuest', () => {
  it('trims text and derives base XP from difficulty', () => {
    const quest = draftToQuest({ ...base, title: '  Run  ', difficulty: 'hard' }, 'q1');
    expect(quest.title).toBe('Run');
    expect(quest.baseXp).toBe(70);
    expect(quest.completed).toBe(false);
    expect(quest.id).toBe('q1');
  });

  it('omits an empty description', () => {
    const quest = draftToQuest({ ...base, description: '   ' }, 'q1');
    expect(quest.description).toBeUndefined();
  });

  it('keeps a trimmed description', () => {
    const quest = draftToQuest({ ...base, description: '  notes ' }, 'q1');
    expect(quest.description).toBe('notes');
  });
});

describe('findDuplicateActivity', () => {
  const quests: Quest[] = [
    { id: 'a', title: 'Drink a glass of water', category: 'health', difficulty: 'easy', baseXp: 20, completed: false },
    { id: 'b', title: '20-minute workout', category: 'fitness', difficulty: 'medium', baseXp: 40, completed: true },
  ];

  it('normalizes case and spacing', () => {
    expect(normalizeTitle('  Drink   a Glass of Water ')).toBe('drink a glass of water');
  });

  it('finds an existing activity regardless of case/spacing', () => {
    expect(findDuplicateActivity(quests, 'drink a glass of WATER')?.id).toBe('a');
    expect(findDuplicateActivity(quests, '20-minute workout')?.id).toBe('b');
  });

  it('returns undefined for a new activity', () => {
    expect(findDuplicateActivity(quests, 'Go for a run')).toBeUndefined();
    expect(findDuplicateActivity(quests, '   ')).toBeUndefined();
  });

  it('ignores the quest being edited', () => {
    expect(findDuplicateActivity(quests, 'Drink a glass of water', 'a')).toBeUndefined();
  });
});
