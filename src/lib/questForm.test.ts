import { validateQuestDraft, draftToQuest, TITLE_MAX, DESCRIPTION_MAX } from './questForm';
import type { QuestDraft } from './questForm';

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
