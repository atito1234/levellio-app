import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation';
import { GameProvider } from '@/state/GameContext';
import { AuthProvider } from '@/state/AuthContext';
import { ProjectsProvider } from '@/state/ProjectsContext';
import { CommunityProvider } from '@/state/CommunityContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { BucketsProvider } from '@/state/BucketsContext';
import { CapacitiesProvider } from '@/state/CapacitiesContext';
import { PlanProvider } from '@/state/PlanContext';
import { GoalProvider } from '@/state/GoalContext';
import { MilestonesProvider } from '@/state/MilestonesContext';
import { BattlesProvider } from '@/state/BattlesContext';
import { JournalProvider } from '@/state/JournalContext';
import { LinksProvider } from '@/state/LinksContext';
import { InterventionProvider } from '@/state/InterventionContext';

/** App entry point. Wraps the nav shell in settings + game + buckets + capacities + plan + goals + milestones + battles + journal + interventions. */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SettingsProvider>
        <AuthProvider>
        <GameProvider>
          <BucketsProvider>
            <CapacitiesProvider>
              <PlanProvider>
                <GoalProvider>
                  <MilestonesProvider>
                    <BattlesProvider>
                      <JournalProvider>
                        <LinksProvider>
                          <InterventionProvider>
                            <ProjectsProvider>
                              <CommunityProvider>
                                <RootNavigator />
                              </CommunityProvider>
                            </ProjectsProvider>
                          </InterventionProvider>
                        </LinksProvider>
                      </JournalProvider>
                    </BattlesProvider>
                  </MilestonesProvider>
                </GoalProvider>
              </PlanProvider>
            </CapacitiesProvider>
          </BucketsProvider>
        </GameProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
