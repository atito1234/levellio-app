import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initI18n } from '@/i18n';
import { RootNavigator } from '@/navigation';

// Initialize translations before first render; SettingsContext switches the
// language once the saved preference (or device locale) loads.
initI18n();
import { GameProvider } from '@/state/GameContext';
import { AuthProvider } from '@/state/AuthContext';
import { ProjectsProvider } from '@/state/ProjectsContext';
import { CommunityProvider } from '@/state/CommunityContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { SubscriptionProvider } from '@/state/SubscriptionContext';
import { AccentProvider } from '@/state/AccentContext';
import { ProfileProvider } from '@/state/ProfileContext';
import { NotificationsProvider } from '@/state/NotificationsContext';
import { StoriesProvider } from '@/state/StoriesContext';
import { MessagingProvider } from '@/state/MessagingContext';
import { BucketsProvider } from '@/state/BucketsContext';
import { CapacitiesProvider } from '@/state/CapacitiesContext';
import { PlanProvider } from '@/state/PlanContext';
import { GoalProvider } from '@/state/GoalContext';
import { RecipesProvider } from '@/state/RecipesContext';
import { ChecklistsProvider } from '@/state/ChecklistsContext';
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
        <SubscriptionProvider>
        <AccentProvider>
        <GameProvider>
          <BucketsProvider>
            <CapacitiesProvider>
              <PlanProvider>
                <GoalProvider>
                  <RecipesProvider>
                  <ChecklistsProvider>
                  <MilestonesProvider>
                    <BattlesProvider>
                      <JournalProvider>
                        <LinksProvider>
                          <InterventionProvider>
                            <ProjectsProvider>
                              <CommunityProvider>
                                <NotificationsProvider>
                                  <ProfileProvider>
                                    <StoriesProvider>
                                      <MessagingProvider>
                                        <RootNavigator />
                                      </MessagingProvider>
                                    </StoriesProvider>
                                  </ProfileProvider>
                                </NotificationsProvider>
                              </CommunityProvider>
                            </ProjectsProvider>
                          </InterventionProvider>
                        </LinksProvider>
                      </JournalProvider>
                    </BattlesProvider>
                  </MilestonesProvider>
                  </ChecklistsProvider>
                  </RecipesProvider>
                </GoalProvider>
              </PlanProvider>
            </CapacitiesProvider>
          </BucketsProvider>
        </GameProvider>
        </AccentProvider>
        </SubscriptionProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
