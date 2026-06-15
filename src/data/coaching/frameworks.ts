/**
 * The honest "evidence" layer for blocker coaching. Each framework is a single
 * source of truth for a plain-language principle + a checkable source label, so
 * questions and tactics can cite real science WITHOUT fabricating per-item
 * statistics. Mirrors the FocusQuote `principle` convention — encouragement and
 * established principles, never invented numbers.
 */
export type FrameworkId =
  | 'com-b'
  | 'fogg-bmap'
  | 'cbt-distortions'
  | 'sdt'
  | 'implementation-intentions'
  | 'motivational-interviewing'
  | 'self-compassion'
  | 'fear-setting'
  | 'temptation-bundling'
  | 'habit-stacking'
  | 'environment-design'
  | 'two-minute-rule'
  | 'five-second-rule'
  | 'zeigarnik'
  | 'loss-aversion'
  | 'timeboxing';

export interface Framework {
  id: FrameworkId;
  /** Plain-language name shown to users. */
  label: string;
  /** One honest sentence on the principle (no over-claiming). */
  principle: string;
  /** Short, checkable source label — author/field, never a fake citation. */
  source: string;
}

export const FRAMEWORKS: readonly Framework[] = [
  { id: 'com-b', label: 'What it takes to act', principle: 'Any action needs three things at once — the ability to do it, a real chance to, and motivation in the moment.', source: 'Michie, COM-B behaviour model' },
  { id: 'fogg-bmap', label: 'Make it easy and well-timed', principle: 'Behaviour happens when motivation, ability, and a prompt line up — the easier the action, the less motivation you need.', source: 'BJ Fogg, Behavior Model' },
  { id: 'cbt-distortions', label: 'Check the thought', principle: 'Stuck feelings often ride on distorted thoughts (all-or-nothing, mind-reading, fortune-telling); naming and testing them loosens their grip.', source: 'Beck & Burns, cognitive behavioural therapy' },
  { id: 'sdt', label: 'Reconnect to your why', principle: 'Motivation lasts when an action feels self-chosen and tied to what you value, not forced on you.', source: 'Deci & Ryan, Self-Determination Theory' },
  { id: 'implementation-intentions', label: 'If-then planning', principle: 'Deciding in advance exactly when and where you will act sharply raises follow-through.', source: 'Gollwitzer, implementation-intentions research' },
  { id: 'motivational-interviewing', label: 'Talk yourself toward it', principle: 'Hearing your own reasons for change — in your own words — builds more commitment than being told.', source: 'Miller & Rollnick, Motivational Interviewing' },
  { id: 'self-compassion', label: 'Be kind to yourself', principle: 'Meeting a slip with kindness instead of harsh self-criticism makes you more likely to get back on track.', source: 'Kristin Neff, self-compassion research' },
  { id: 'fear-setting', label: 'Name the worst case', principle: 'Writing out what you fear, and how you would cope, shrinks vague dread into something you can handle.', source: 'Stoic practice; Tim Ferriss, fear-setting' },
  { id: 'temptation-bundling', label: 'Pair it with a treat', principle: 'Linking a habit you should do with something you enjoy makes you more likely to actually do it.', source: 'Milkman, temptation-bundling research' },
  { id: 'habit-stacking', label: 'Anchor to an existing habit', principle: 'Attaching a new habit right after one you already do gives it a reliable, built-in cue.', source: 'Fogg & Clear, habit stacking' },
  { id: 'environment-design', label: 'Design your surroundings', principle: 'Making the good choice the easy, obvious one — and distractions harder — beats relying on willpower.', source: 'Behavioural environment-design research' },
  { id: 'two-minute-rule', label: 'Two-minute start', principle: 'Shrinking a habit to two minutes lowers the cost to begin — and starting is most of the battle.', source: 'Clear & Fogg, tiny-habits' },
  { id: 'five-second-rule', label: 'Move in five seconds', principle: 'Counting down 5-4-3-2-1 and moving interrupts hesitation before your brain talks you out of it.', source: 'Mel Robbins, the 5 Second Rule' },
  { id: 'zeigarnik', label: 'Just start the loop', principle: 'Unfinished tasks nag at the mind — once you begin, the pull to finish works in your favour.', source: 'Zeigarnik effect' },
  { id: 'loss-aversion', label: 'Protect what you have built', principle: 'We feel a loss about twice as strongly as a gain, so not breaking a chain you have built is a powerful pull.', source: 'Kahneman & Tversky, loss aversion' },
  { id: 'timeboxing', label: 'Short focused sprints', principle: 'Single-tasked sprints with a clear end protect attention and make starting feel safe.', source: 'Cirillo, Pomodoro Technique; timeboxing research' },
];

/** Resolve a framework by id. Pure. */
export function getFramework(id: FrameworkId): Framework {
  return FRAMEWORKS.find((f) => f.id === id) ?? FRAMEWORKS[0]!;
}
