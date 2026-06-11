import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation';
import { GameProvider } from '@/state/GameContext';
import { SettingsProvider } from '@/state/SettingsContext';
import { BucketsProvider } from '@/state/BucketsContext';

/** App entry point. Wraps the navigation shell in settings + game + buckets + safe-area. */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SettingsProvider>
        <GameProvider>
          <BucketsProvider>
            <RootNavigator />
          </BucketsProvider>
        </GameProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
