import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation';
import { GameProvider } from '@/state/GameContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { BucketsProvider } from '@/state/BucketsContext';
import { CapacitiesProvider } from '@/state/CapacitiesContext';
import { PlanProvider } from '@/state/PlanContext';
import { GoalProvider } from '@/state/GoalContext';
import { MilestonesProvider } from '@/state/MilestonesContext';
import { BattlesProvider } from '@/state/BattlesContext';
import { JournalProvider } from '@/state/JournalContext';
import { InterventionProvider } from '@/state/InterventionContext';

/** App entry point. Wraps the nav shell in settings + game + buckets + capacities + plan + goals + milestones + battles + journal + interventions. */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SettingsProvider>
        <GameProvider>
          <BucketsProvider>
            <CapacitiesProvider>
              <PlanProvider>
                <GoalProvider>
                  <MilestonesProvider>
                    <BattlesProvider>
                      <JournalProvider>
                        <InterventionProvider>
                          <RootNavigator />
                        </InterventionProvider>
                      </JournalProvider>
                    </BattlesProvider>
                  </MilestonesProvider>
                </GoalProvider>
              </PlanProvider>
            </CapacitiesProvider>
          </BucketsProvider>
        </GameProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
