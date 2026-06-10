import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation';
import { GameProvider } from '@/state/GameContext';
import { SettingsProvider } from '@/state/SettingsContext';

/** App entry point. Wraps the navigation shell in settings + game + safe-area. */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SettingsProvider>
        <GameProvider>
          <RootNavigator />
        </GameProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
