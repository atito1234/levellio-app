/**
 * Pure mapping from an InsightAction → a navigation call. Kept React-free (only a
 * type-only nav import) so it's unit-testable and reusable. The hook
 * (useInsightAction) supplies the real, typed navigator.
 */
import { shiftDayKey } from '../dates';
import { weekdayOfKey } from '../recurrence';
import type { RootStackParamList } from '@/navigation/types';
import type { InsightAction } from './types';

/** Minimal navigator surface — satisfied by react-navigation's typed prop. */
export interface ActionNavigator {
  navigate: (name: keyof RootStackParamList, params?: object) => void;
}

/** The next day key (today onward) that falls on the given weekday (0=Sun). */
export function nextWeekdayKey(weekday: number, fromKey: string): string {
  for (let i = 0; i < 7; i += 1) {
    const k = shiftDayKey(fromKey, i);
    if (weekdayOfKey(k) === weekday) return k;
  }
  return fromKey;
}

/** Execute an InsightAction against a navigator. */
export function runInsightAction(navigation: ActionNavigator, action: InsightAction, todayKey: string): void {
  const t = action.target;
  switch (action.kind) {
    case 'plan':
      navigation.navigate('Plan', t.dayKey ? { day: t.dayKey } : undefined);
      return;
    case 'do':
      if (t.questId) navigation.navigate('Ripple', { questId: t.questId });
      return;
    case 'edit':
      if (t.questId) navigation.navigate('QuestEditor', { questId: t.questId });
      return;
    case 'schedule':
      if (t.questId) navigation.navigate('QuestEditor', { questId: t.questId });
      else if (t.weekday != null) navigation.navigate('Plan', { day: nextWeekdayKey(t.weekday, todayKey) });
      return;
    case 'focus':
      if (t.goalId) navigation.navigate('GoalFocus', { goalId: t.goalId });
      else if (t.capacityId) navigation.navigate('CapacityFocus', { capacityId: t.capacityId });
      else if (t.questId) navigation.navigate('ActivityJourney', { activityId: t.questId });
      else if (t.bucketId) navigation.navigate('Organize');
      return;
    default:
      return;
  }
}
