import {
  validateQuestDraft,
  draftToQuest,
  findDuplicateActivity,
  normalizeTitle,
  pickSurvivor,
  mergeDuplicateGroup,
  dedupeQuests,
  withCanonicalKeys,
  sanitizeDays,
  TITLE_MAX,
  DESCRIPTION_MAX,
} from './questForm';
import type { QuestDraft } from './questForm';
import type { Quest } from '@/types';

const q = (id: string, over: Partial<Quest> = {}): Quest => ({
  id,
  title: '20-minute workout',
  category: 'fitness',
  difficulty: 'medium',
  baseXp: 40,
  completed: false,
  ...over,
});

const base: QuestDraft = { title: 'Read a book', category: 'learning', difficulty: 'medium' };

describe('sanitizeDays + scheduledDays', () => {
  it('dedupes, sorts, and drops invalid weekday indices', () => {
    expect(sanitizeDays([3, 1, 1, 7, -1, 5.5, 6])).toEqual([1, 3, 6]);
    expect(sanitizeDays(undefined)).toEqual([]);
  });

  it('draftToQuest carries sanitized scheduledDays, omitting when empty', () => {
    expect(draftToQuest({ ...base, scheduledDays: [5, 1, 1] }, 'q1').scheduledDays).toEqual([1, 5]);
    expect(draftToQuest({ ...base, scheduledDays: [] }, 'q2').scheduledDays).toBeUndefined();
    expect(draftToQuest({ ...base, scheduledDays: [9, -2] }, 'q3').scheduledDays).toBeUndefined();
  });

  it('mergeDuplicateGroup unions scheduledDays across duplicates', () => {
    const merged = mergeDuplicateGroup([
      q('a', { scheduledDays: [1, 3] }),
      q('b', { scheduledDays: [3, 5] }),
    ]);
    expect(merged.scheduledDays).toEqual([1, 3, 5]);
  });
});

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

  it('carries an opt-in rating metric and a trimmed why, omitting blanks', () => {
    const quest = draftToQuest({ ...base, metric: 'rating', why: '  so I feel calmer ' }, 'q1');
    expect(quest.metric).toBe('rating');
    expect(quest.why).toBe('so I feel calmer');
    const plain = draftToQuest(base, 'q2');
    expect(plain.metric).toBeUndefined();
    expect(plain.why).toBeUndefined();
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

describe('draftToQuest canonicalKey', () => {
  it('stamps the canonical key from the trimmed title', () => {
    expect(draftToQuest({ ...base, title: '  Run Fast ' }, 'q1').canonicalKey).toBe('run fast');
  });
});

describe('pickSurvivor', () => {
  it('prefers the most recently completed', () => {
    const dupes = [q('a'), q('b', { lastCompletedDate: '2026-06-14' }), q('c', { lastCompletedDate: '2026-06-10' })];
    expect(pickSurvivor(dupes).id).toBe('b');
  });

  it('prefers a scheduled time when completion dates tie', () => {
    expect(pickSurvivor([q('a'), q('b', { scheduledTime: 450 })]).id).toBe('b');
  });
});

describe('mergeDuplicateGroup', () => {
  it('folds the best signal into the survivor', () => {
    const merged = mergeDuplicateGroup([
      q('a', { scheduledTime: 450 }),
      q('b', { completed: true, lastCompletedDate: '2026-06-15' }),
      q('c', { description: 'push hard' }),
    ]);
    expect(merged.id).toBe('b'); // survivor = most recent completion
    expect(merged.completed).toBe(true);
    expect(merged.lastCompletedDate).toBe('2026-06-15');
    expect(merged.scheduledTime).toBe(450); // picked up from a sibling
    expect(merged.description).toBe('push hard');
    expect(merged.canonicalKey).toBe('20-minute workout');
  });
});

describe('dedupeQuests', () => {
  it('collapses same-key quests and remaps old ids to the survivor', () => {
    const list = [
      q('a'),
      q('b', { lastCompletedDate: '2026-06-15' }),
      { ...q('c'), title: 'Go for a 5km run', canonicalKey: 'go for a 5km run' },
    ];
    const { quests: out, remap } = dedupeQuests(list);
    expect(out).toHaveLength(2);
    expect(remap['a']).toBe('b'); // both workouts -> survivor b
    expect(remap['b']).toBe('b');
    expect(remap['c']).toBe('c'); // the run is its own survivor
  });

  it('uses the title when canonicalKey is missing', () => {
    const { quests: out } = dedupeQuests([q('a'), q('b', { canonicalKey: undefined })]);
    expect(out).toHaveLength(1);
  });
});

describe('withCanonicalKeys', () => {
  it('backfills missing keys without touching existing ones', () => {
    const out = withCanonicalKeys([q('a', { canonicalKey: undefined }), q('b', { canonicalKey: 'custom' })]);
    expect(out[0]!.canonicalKey).toBe('20-minute workout');
    expect(out[1]!.canonicalKey).toBe('custom');
  });
});
