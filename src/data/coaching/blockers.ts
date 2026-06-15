/**
 * The exhaustive blocker taxonomy — many fine-grained, plain-language patterns
 * mapped onto the 6 friendly "dragon" faces. This is how we stay rigorous
 * (drawing on COM-B, Fogg, CBT, SDT, etc. via `frameworkIds`) while keeping the
 * surface approachable. Each blocker points at the tactics and Socratic
 * questions that best counter it, best-first.
 */
import type { JournalMood } from '@/lib/journal';
import type { FrameworkId } from './frameworks';

export interface Blocker {
  id: string;
  /** Which dragon face this lives under (a dragon id from src/data/dragons.ts). */
  dragonId: string;
  /** Plain-language name for any audience. */
  label: string;
  /** How it shows up, in the user's own voice. */
  tell: string;
  /** Frameworks that explain it (for evidence + future matching). */
  frameworkIds: readonly FrameworkId[];
  /** Moods that commonly co-occur (matched against the latest journal mood). */
  moods: readonly JournalMood[];
  /** Tactic ids that best counter THIS pattern, best-first. */
  tacticIds: readonly string[];
  /** Socratic question ids, most-provoking first. */
  questionIds: readonly string[];
}

export const BLOCKERS: readonly Blocker[] = [
  // --- Laziness ---
  { id: 'low-energy', dragonId: 'laziness', label: 'Running on empty', tell: 'I’m too tired to start.', frameworkIds: ['fogg-bmap', 'two-minute-rule'], moods: ['drained', 'stuck'], tacticIds: ['mini-version', 'two-minute-rule', 'habit-stack'], questionIds: ['q-energy-now', 'q-smallest', 'q-one-step'] },
  { id: 'no-cue', dragonId: 'laziness', label: 'It slips my mind', tell: 'I just forget or never get to it.', frameworkIds: ['habit-stacking', 'implementation-intentions'], moods: ['stuck'], tacticIds: ['habit-stack', 'if-then', 'environment-design'], questionIds: ['q-after-what', 'q-when-where', 'q-remove-friction'] },
  { id: 'too-much-friction', dragonId: 'laziness', label: 'Too much hassle', tell: 'It’s just a hassle to get going.', frameworkIds: ['environment-design', 'fogg-bmap'], moods: ['resisting', 'drained'], tacticIds: ['environment-design', 'two-minute-rule', 'if-then'], questionIds: ['q-remove-friction', 'q-one-step', 'q-smallest'] },
  { id: 'no-momentum', dragonId: 'laziness', label: 'Waiting to feel like it', tell: 'I’ll start once I feel like it.', frameworkIds: ['five-second-rule', 'zeigarnik'], moods: ['stuck', 'resisting'], tacticIds: ['five-second-rule', 'two-minute-rule', 'pomodoro'], questionIds: ['q-5min-change', 'q-tiny-promise', 'q-feel-after'] },
  { id: 'boredom', dragonId: 'laziness', label: 'It’s boring', tell: 'It’s so dull I avoid it.', frameworkIds: ['temptation-bundling', 'sdt'], moods: ['resisting'], tacticIds: ['temptation-bundle', 'values-anchor', 'pomodoro'], questionIds: ['q-treat-pair', 'q-why-matters', 'q-smallest'] },

  // --- Fear ---
  { id: 'fear-of-failure', dragonId: 'fear', label: 'Fear of failing', tell: 'What if I try and fail?', frameworkIds: ['cbt-distortions', 'fear-setting'], moods: ['anxious'], tacticIds: ['fear-setting', 'reframe-thought', 'mini-version'], questionIds: ['q-worst-case', 'q-evidence', 'q-smallest'] },
  { id: 'fear-of-judgment', dragonId: 'fear', label: 'Fear of being judged', tell: 'People will judge me for this.', frameworkIds: ['fear-setting', 'cbt-distortions'], moods: ['anxious', 'resisting'], tacticIds: ['fear-setting', 'reframe-thought', 'self-compassion-break'], questionIds: ['q-name-fear', 'q-advice-friend', 'q-evidence'] },
  { id: 'uncertainty', dragonId: 'fear', label: 'Not knowing how it’ll go', tell: 'I don’t know how this will turn out.', frameworkIds: ['fear-setting', 'fogg-bmap'], moods: ['anxious', 'stuck'], tacticIds: ['fear-setting', 'two-minute-rule', 'if-then'], questionIds: ['q-worst-case', 'q-one-step', 'q-when-where'] },
  { id: 'overwhelm', dragonId: 'fear', label: 'It feels too big', tell: 'It feels too big to even face.', frameworkIds: ['two-minute-rule', 'fogg-bmap'], moods: ['anxious', 'drained', 'stuck'], tacticIds: ['mini-version', 'two-minute-rule', 'pomodoro'], questionIds: ['q-smallest', 'q-one-step', 'q-energy-now'] },
  { id: 'fear-of-change', dragonId: 'fear', label: 'Scared of what changes', tell: 'What if this changes everything?', frameworkIds: ['sdt', 'motivational-interviewing'], moods: ['anxious', 'resisting'], tacticIds: ['values-anchor', 'reasons-out-loud', 'reframe-thought'], questionIds: ['q-future-self', 'q-why-matters', 'q-reasons'] },

  // --- Unworthiness ---
  { id: 'imposter', dragonId: 'unworthiness', label: 'I’m not cut out for this', tell: 'I’m not really cut out for this.', frameworkIds: ['cbt-distortions', 'self-compassion'], moods: ['anxious', 'stuck'], tacticIds: ['reframe-thought', 'self-compassion-break', 'mini-version'], questionIds: ['q-whose-voice', 'q-evidence', 'q-advice-friend'] },
  { id: 'not-deserving', dragonId: 'unworthiness', label: 'I don’t deserve it', tell: 'I don’t deserve to do this for myself.', frameworkIds: ['self-compassion', 'sdt'], moods: ['drained', 'stuck'], tacticIds: ['self-compassion-break', 'values-anchor', 'mini-version'], questionIds: ['q-deserve', 'q-advice-friend', 'q-why-matters'] },
  { id: 'comparison', dragonId: 'unworthiness', label: 'Everyone’s ahead of me', tell: 'Everyone else is so far ahead.', frameworkIds: ['cbt-distortions', 'sdt'], moods: ['drained', 'resisting'], tacticIds: ['reframe-thought', 'values-anchor', 'two-minute-rule'], questionIds: ['q-whose-voice', 'q-why-matters', 'q-smallest'] },
  { id: 'self-criticism', dragonId: 'unworthiness', label: 'I always mess up', tell: 'I always mess this up anyway.', frameworkIds: ['self-compassion', 'cbt-distortions'], moods: ['drained', 'stuck'], tacticIds: ['self-compassion-break', 'reframe-thought', 'mini-version'], questionIds: ['q-advice-friend', 'q-evidence', 'q-past-win'] },
  { id: 'perfection-worth', dragonId: 'unworthiness', label: 'It has to be perfect', tell: 'If it’s not perfect it doesn’t count.', frameworkIds: ['cbt-distortions', 'self-compassion'], moods: ['resisting', 'stuck'], tacticIds: ['reframe-thought', 'mini-version', 'self-compassion-break'], questionIds: ['q-perfection', 'q-smallest', 'q-advice-friend'] },

  // --- Doubt ---
  { id: 'wont-work', dragonId: 'doubt', label: 'It won’t make a difference', tell: 'This won’t even change anything.', frameworkIds: ['cbt-distortions', 'sdt'], moods: ['resisting', 'stuck'], tacticIds: ['reframe-thought', 'mini-version', 'values-anchor'], questionIds: ['q-proof', 'q-evidence', 'q-why-matters'] },
  { id: 'no-proof-yet', dragonId: 'doubt', label: 'Nothing to show yet', tell: 'I’ve got nothing to show for it.', frameworkIds: ['zeigarnik', 'two-minute-rule'], moods: ['drained', 'stuck'], tacticIds: ['two-minute-rule', 'pomodoro', 'if-then'], questionIds: ['q-proof', 'q-one-step', 'q-feel-after'] },
  { id: 'tried-before', dragonId: 'doubt', label: 'It didn’t stick before', tell: 'I’ve tried before and it didn’t last.', frameworkIds: ['cbt-distortions', 'self-compassion'], moods: ['drained', 'resisting'], tacticIds: ['reframe-thought', 'self-compassion-break', 'if-then'], questionIds: ['q-past-win', 'q-evidence', 'q-when-where'] },
  { id: 'all-or-nothing', dragonId: 'doubt', label: 'All or nothing', tell: 'If I can’t do it fully, why bother?', frameworkIds: ['cbt-distortions', 'two-minute-rule'], moods: ['resisting', 'stuck'], tacticIds: ['reframe-thought', 'mini-version', 'two-minute-rule'], questionIds: ['q-perfection', 'q-smallest', 'q-tiny-promise'] },
  { id: 'overthinking', dragonId: 'doubt', label: 'Stuck in my head', tell: 'I keep analysing instead of doing.', frameworkIds: ['five-second-rule', 'two-minute-rule'], moods: ['anxious', 'stuck'], tacticIds: ['five-second-rule', 'two-minute-rule', 'if-then'], questionIds: ['q-one-step', 'q-tiny-promise', 'q-5min-change'] },

  // --- Procrastination ---
  { id: 'task-aversion', dragonId: 'procrastination', label: 'I just don’t want to', tell: 'I really don’t want to start.', frameworkIds: ['two-minute-rule', 'fogg-bmap'], moods: ['resisting', 'drained'], tacticIds: ['two-minute-rule', 'five-second-rule', 'pomodoro'], questionIds: ['q-resist-what', 'q-smallest', 'q-tiny-promise'] },
  { id: 'waiting-to-feel-ready', dragonId: 'procrastination', label: 'Waiting to feel ready', tell: 'I’ll start when I feel ready.', frameworkIds: ['five-second-rule', 'cbt-distortions'], moods: ['stuck', 'resisting'], tacticIds: ['five-second-rule', 'two-minute-rule', 'if-then'], questionIds: ['q-5min-change', 'q-tiny-promise', 'q-feel-after'] },
  { id: 'present-bias', dragonId: 'procrastination', label: 'Something funner right now', tell: 'I’d rather do something fun right now.', frameworkIds: ['temptation-bundling', 'loss-aversion'], moods: ['resisting'], tacticIds: ['temptation-bundle', 'pomodoro', 'environment-design'], questionIds: ['q-cost-of-skip', 'q-treat-pair', 'q-feel-after'] },
  { id: 'vague-plan', dragonId: 'procrastination', label: 'Not sure where to start', tell: 'I’m not sure where to begin.', frameworkIds: ['implementation-intentions', 'two-minute-rule'], moods: ['stuck'], tacticIds: ['if-then', 'two-minute-rule', 'habit-stack'], questionIds: ['q-when-where', 'q-one-step', 'q-smallest'] },
  { id: 'distraction', dragonId: 'procrastination', label: 'Keep getting pulled away', tell: 'I keep getting pulled away.', frameworkIds: ['environment-design', 'timeboxing'], moods: ['stuck', 'resisting'], tacticIds: ['environment-design', 'pomodoro', 'if-then'], questionIds: ['q-remove-friction', 'q-when-where', 'q-one-step'] },

  // --- "Too Old" ---
  { id: 'fixed-mindset', dragonId: 'tooold', label: 'Too old to change', tell: 'I’m too old to change now.', frameworkIds: ['cbt-distortions', 'sdt'], moods: ['drained', 'resisting'], tacticIds: ['reframe-thought', 'values-anchor', 'mini-version'], questionIds: ['q-too-late', 'q-evidence', 'q-future-self'] },
  { id: 'sunk-cost', dragonId: 'tooold', label: 'Left it too late', tell: 'I’ve left it too late to matter.', frameworkIds: ['cbt-distortions', 'loss-aversion'], moods: ['drained', 'stuck'], tacticIds: ['reframe-thought', 'two-minute-rule', 'values-anchor'], questionIds: ['q-too-late', 'q-cost-of-skip', 'q-why-matters'] },
  { id: 'low-energy-age', dragonId: 'tooold', label: 'Not the energy I had', tell: 'I don’t have the energy I used to.', frameworkIds: ['fogg-bmap', 'two-minute-rule'], moods: ['drained'], tacticIds: ['mini-version', 'two-minute-rule', 'habit-stack'], questionIds: ['q-energy-now', 'q-smallest', 'q-one-step'] },
  { id: 'comparison-young', dragonId: 'tooold', label: 'Everyone’s younger', tell: 'Everyone starting this is younger than me.', frameworkIds: ['cbt-distortions', 'sdt'], moods: ['drained', 'resisting'], tacticIds: ['reframe-thought', 'values-anchor', 'self-compassion-break'], questionIds: ['q-whose-voice', 'q-why-matters', 'q-future-self'] },
];

/** Blockers filed under a given dragon (preserves declared order). Pure. */
export function blockersForDragon(dragonId: string): readonly Blocker[] {
  return BLOCKERS.filter((b) => b.dragonId === dragonId);
}

/** Resolve a blocker by id. Pure. */
export function getBlocker(id: string): Blocker | undefined {
  return BLOCKERS.find((b) => b.id === id);
}

/**
 * Universal fallback cluster for dragons without curated blockers (e.g. a custom
 * dragon) — the most broadly useful patterns. Pure.
 */
export const GENERAL_BLOCKER_IDS: readonly string[] = ['task-aversion', 'overwhelm', 'all-or-nothing', 'low-energy'];
