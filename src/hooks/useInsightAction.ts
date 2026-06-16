/**
 * Binds the pure InsightAction → navigation mapping (lib/metrics/actions) to the
 * current navigator and today's date — the bridge that makes every insight
 * "connected to actions". One contract, one place, consistent CTAs everywhere.
 */
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { dayKey } from '@/lib/dates';
import { runInsightAction, type ActionNavigator } from '@/lib/metrics/actions';
import type { InsightAction } from '@/lib/metrics/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Hook returning a `run(action)` callback bound to the navigator + today. */
export function useInsightAction(): (action: InsightAction) => void {
  const navigation = useNavigation<Nav>();
  return useCallback(
    (action: InsightAction) => runInsightAction(navigation as unknown as ActionNavigator, action, dayKey(new Date())),
    [navigation],
  );
}
