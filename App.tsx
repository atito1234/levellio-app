import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation';
import { GameProvider } from '@/state/GameContext';

/** App entry point. Wraps the navigation shell in game state + safe-area context. */
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <GameProvider>
        <RootNavigator />
      </GameProvider>
    </SafeAreaProvider>
  );
}
