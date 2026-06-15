/**
 * Evidence-based tactics — the "possible solutions" matched to a blocker. Pomodoro
 * is just one of many. Each carries a plain-language how-to and ties to a
 * Framework for honest evidence. `timeCostMin` is the cost of the FIRST step, so
 * the engine can recommend something that fits the time the user actually has.
 */
import type { QuestCategory } from '@/types';
import type { FrameworkId } from './frameworks';

export interface Tactic {
  id: string;
  /** Plain-language name. */
  name: string;
  /** How to do it, in one or two imperative sentences. */
  how: string;
  /** Evidence anchor (-> principle + source). */
  frameworkId: FrameworkId;
  /** Minutes the first step costs — drives time-available matching. */
  timeCostMin: number;
  /** Categories this suits best; omitted/empty = universal. */
  categories?: readonly QuestCategory[];
}

export const TACTICS: readonly Tactic[] = [
  { id: 'two-minute-rule', name: 'The two-minute start', how: 'Promise yourself just two minutes. Begin the tiniest first action and let momentum take over.', frameworkId: 'two-minute-rule', timeCostMin: 2 },
  { id: 'mini-version', name: 'Shrink the goal', how: 'Cut it down to a version so small it feels almost silly to skip — one page, one set, one line.', frameworkId: 'two-minute-rule', timeCostMin: 5 },
  { id: 'five-second-rule', name: 'Five-second launch', how: 'Count 5-4-3-2-1 and physically move before the hesitation can grow.', frameworkId: 'five-second-rule', timeCostMin: 1 },
  { id: 'if-then', name: 'If-then plan', how: 'Lock in the exact cue: “When I [finish X / it’s 7pm], then I will [do this] here.”', frameworkId: 'implementation-intentions', timeCostMin: 2 },
  { id: 'habit-stack', name: 'Stack it on a habit', how: 'Attach it right after something you already do every day, so the old habit becomes the cue.', frameworkId: 'habit-stacking', timeCostMin: 2 },
  { id: 'environment-design', name: 'Set the stage', how: 'Remove one bit of friction and put the cue in plain sight — make starting the path of least resistance.', frameworkId: 'environment-design', timeCostMin: 5 },
  { id: 'temptation-bundle', name: 'Pair it with a treat', how: 'Only let yourself enjoy something you love (a show, a podcast) while you do this.', frameworkId: 'temptation-bundling', timeCostMin: 5 },
  { id: 'pomodoro', name: 'A focus sprint', how: 'Set a short timer, single-task until it rings, then take a real break. One sprint is enough to start.', frameworkId: 'timeboxing', timeCostMin: 10, categories: ['productivity', 'learning', 'creativity'] },
  { id: 'reframe-thought', name: 'Test the thought', how: 'Write the harsh thought down, then list the evidence for and against it. Replace it with a fairer one.', frameworkId: 'cbt-distortions', timeCostMin: 5 },
  { id: 'self-compassion-break', name: 'A kindness break', how: 'Say what you’d tell a struggling friend: this is hard, you’re human, and one small step is enough.', frameworkId: 'self-compassion', timeCostMin: 3 },
  { id: 'fear-setting', name: 'Name the worst case', how: 'Write the worst that could happen, how likely it is, and how you’d recover. Watch the dread shrink.', frameworkId: 'fear-setting', timeCostMin: 10 },
  { id: 'values-anchor', name: 'Reconnect to your why', how: 'Finish this out loud: “I’m doing this because it matters to me, since…” Let the reason pull you.', frameworkId: 'sdt', timeCostMin: 3 },
  { id: 'reasons-out-loud', name: 'Three reasons, your words', how: 'Say three honest reasons this is worth doing today. Hearing your own case builds real commitment.', frameworkId: 'motivational-interviewing', timeCostMin: 3 },
];

/** Resolve a tactic by id. Pure. */
export function getTactic(id: string): Tactic | undefined {
  return TACTICS.find((t) => t.id === id);
}
