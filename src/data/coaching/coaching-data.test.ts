import { DRAGONS } from '@/data/dragons';
import { findForbiddenPhrases } from '@/content/uiCopy';
import { FRAMEWORKS, type FrameworkId } from './frameworks';
import { BLOCKERS, GENERAL_BLOCKER_IDS, getBlocker } from './blockers';
import { QUESTIONS, getQuestion } from './questions';
import { TACTICS, getTactic } from './tactics';

const dragonIds = new Set(DRAGONS.map((d) => d.id));
const frameworkIds = new Set<FrameworkId>(FRAMEWORKS.map((f) => f.id));

describe('coaching library integrity', () => {
  it('maps every blocker to a real dragon', () => {
    for (const b of BLOCKERS) expect(dragonIds.has(b.dragonId)).toBe(true);
  });

  it('resolves every tactic / question / framework referenced by a blocker', () => {
    for (const b of BLOCKERS) {
      for (const id of b.tacticIds) expect(getTactic(id)).toBeDefined();
      for (const id of b.questionIds) expect(getQuestion(id)).toBeDefined();
      for (const id of b.frameworkIds) expect(frameworkIds.has(id)).toBe(true);
    }
  });

  it('ties every question and tactic to a real framework', () => {
    for (const q of QUESTIONS) expect(frameworkIds.has(q.frameworkId)).toBe(true);
    for (const t of TACTICS) expect(frameworkIds.has(t.frameworkId)).toBe(true);
  });

  it('resolves the universal fallback cluster', () => {
    for (const id of GENERAL_BLOCKER_IDS) expect(getBlocker(id)).toBeDefined();
  });

  it('has unique ids within each collection', () => {
    const uniq = (xs: { id: string }[]) => expect(new Set(xs.map((x) => x.id)).size).toBe(xs.length);
    uniq([...FRAMEWORKS]);
    uniq([...BLOCKERS]);
    uniq([...QUESTIONS]);
    uniq([...TACTICS]);
  });
});

describe('coaching copy honesty', () => {
  it('contains no forbidden user-facing phrases', () => {
    const strings = [
      ...FRAMEWORKS.flatMap((f) => [f.label, f.principle, f.source]),
      ...BLOCKERS.flatMap((b) => [b.label, b.tell]),
      ...QUESTIONS.flatMap((q) => [q.text, q.followUp ?? '']),
      ...TACTICS.flatMap((t) => [t.name, t.how]),
    ];
    expect(findForbiddenPhrases(strings)).toEqual([]);
  });
});
