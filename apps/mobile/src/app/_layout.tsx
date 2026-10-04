import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useHealthStore } from '../store/useHealthStore';

export default function RootLayout() {
  const { loadStoredProfile } = useAuthStore();
  const { loadStoredHealth } = useHealthStore();

  useEffect(() => {
    loadStoredProfile();
    loadStoredHealth();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report/upload" options={{ presentation: 'card' }} />
        <Stack.Screen name="report/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="diet/plan" options={{ presentation: 'card' }} />
        <Stack.Screen name="meal/scan" options={{ presentation: 'card' }} />
        <Stack.Screen name="care/nearby" options={{ presentation: 'card' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
