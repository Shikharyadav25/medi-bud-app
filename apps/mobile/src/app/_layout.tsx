import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { useAuthStore } from "../store/useAuthStore";
import { useHealthStore } from "../store/useHealthStore";
import { supabase } from "../services/supabase";
import { useChatStore } from "../store/useChatStore";

export default function RootLayout() {
  const { loadStoredProfile, hasHydrated, isAuthenticated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const protectedRoute = ["(tabs)", "report", "diet", "meal", "care"].includes(
    segments[0] || "",
  );

  useEffect(() => {
    loadStoredProfile();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        useAuthStore.setState({ isAuthenticated: false });
        useHealthStore.getState().resetForNewUser();
        useChatStore.getState().clearMessages();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated && protectedRoute)
      router.replace("/(auth)/login");
  }, [hasHydrated, isAuthenticated, protectedRoute]);
  if (protectedRoute && (!hasHydrated || !isAuthenticated)) return null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="report/upload" options={{ presentation: "card" }} />
        <Stack.Screen name="report/[id]" options={{ presentation: "card" }} />
        <Stack.Screen name="diet/plan" options={{ presentation: "card" }} />
        <Stack.Screen name="meal/scan" options={{ presentation: "card" }} />
        <Stack.Screen name="care/nearby" options={{ presentation: "card" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
