import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { HealthScore } from '../../components/ui/HealthScore';
import { PersistentBottomSheet } from '../../components/ui/PersistentBottomSheet';
import { useAuthStore } from '../../store/useAuthStore';

export default function AssistantPreviewScreen() {
  const router = useRouter();
  const { profile, completeOnboarding } = useAuthStore();

  const handleEnterApp = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Dimmed Background Dashboard */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Dashboard Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Health Circle</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={handleEnterApp} style={styles.personButton}>
            <Feather name="user" size={18} color={COLORS.primaryAccent} />
          </TouchableOpacity>
        </View>

        {/* Health Score 82/100 with Goal > and Pro Treatment */}
        <HealthScore score={82} maxScore={100} showPremiumLock={true} onPressGoal={handleEnterApp} />

        {/* Subtle background preview cards */}
        <View style={styles.previewSection}>
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Feather name="droplet" size={16} color="#0277BD" />
              <Text style={styles.previewTitle}>Hydration</Text>
            </View>
            <Text style={styles.previewVal}>1750 ml / 2500 ml</Text>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <Feather name="activity" size={16} color="#E65100" />
              <Text style={styles.previewTitle}>Habits & Workouts</Text>
            </View>
            <Text style={styles.previewVal}>2 of 3 Completed Today</Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={handleEnterApp} style={styles.enterAppBanner}>
          <Text style={styles.enterAppText}>Explore Full Health Dashboard →</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Persistent Draggable Bottom Sheet matching Screen 4 specification */}
      <PersistentBottomSheet onSendMessage={() => {
        completeOnboarding();
      }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 200, // Space above bottom sheet
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  personButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.1)',
  },
  previewSection: {
    gap: 12,
    marginTop: 4,
    opacity: 0.85,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  previewVal: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  enterAppBanner: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  enterAppText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
});
