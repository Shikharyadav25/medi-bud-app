import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="health-data" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="assistant-preview" />
    </Stack>
  );
}
