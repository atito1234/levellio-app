import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation';
import { GameProvider } from '@/state/GameContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { BucketsProvider } from '@/state/BucketsContext';
import { CapacitiesProvider } from '@/state/CapacitiesContext';
import { PlanProvider } from '@/state/PlanContext';

/** App entry point. Wraps the nav shell in settings + game + buckets + capacities + plan. */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SettingsProvider>
        <GameProvider>
          <BucketsProvider>
            <CapacitiesProvider>
              <PlanProvider>
                <RootNavigator />
              </PlanProvider>
            </CapacitiesProvider>
          </BucketsProvider>
        </GameProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
