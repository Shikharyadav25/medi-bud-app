import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';

export default function IndexScreen() {
  const router = useRouter();
  const { isOnboardingCompleted, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOnboardingCompleted && isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(onboarding)/splash');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [isOnboardingCompleted, isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primaryAccent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
