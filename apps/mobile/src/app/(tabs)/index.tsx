import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY, TRACKING, SHADOWS } from '../../constants/theme';
import { HealthScore } from '../../components/ui/HealthScore';
import { WaterTrackerCard } from '../../components/health/WaterTrackerCard';
import { VitalsCard } from '../../components/health/VitalsCard';
import { ReportTimelineCard } from '../../components/health/ReportTimelineCard';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';
import { PersistentBottomSheet } from '../../components/ui/PersistentBottomSheet';
import { useAuthStore } from '../../store/useAuthStore';
import { useHealthStore } from '../../store/useHealthStore';

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { vitals, waterIntakeMl, waterGoalMl, waterStreakDays, addWater, reports, workouts, recentMeals } = useHealthStore();

  const completedWorkouts = workouts.filter((w) => w.completed).length;
  const healthScore = Math.round(
    Math.min(35, (waterIntakeMl / Math.max(waterGoalMl, 1)) * 35) +
    (recentMeals.length ? 25 : 0) +
    (workouts.length ? (completedWorkouts / workouts.length) * 25 : 0) +
    (reports.length ? 15 : 0)
  );
  const hydrationPercent = Math.min(100, Math.round((waterIntakeMl / Math.max(waterGoalMl, 1)) * 100));
  const dietPercent = recentMeals.length ? Math.min(100, recentMeals.length * 25) : 0;
  const habitsPercent = workouts.length ? Math.round((completedWorkouts / workouts.length) * 100) : 0;

  const todayString = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Apple Style Large Title Header with Uppercase Date Eyebrow */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.dateEyebrow}>{todayString}</Text>
            <Text style={styles.largeTitle}>Namaste, {profile.name || 'Aarav'}</Text>
          </View>

          <View style={styles.topBarActions}>
            <Pressable
              onPress={() => router.push('/care/nearby')}
              style={({ pressed }) => [styles.careBadge, pressed && styles.elementPressed]}
            >
              <Feather name="map-pin" size={13} color={COLORS.appleRed} />
              <Text style={styles.careBadgeText}>Care</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              style={({ pressed }) => [styles.avatarButton, pressed && styles.elementPressed]}
            >
              <Feather name="user" size={17} color={COLORS.primaryAccent} />
            </Pressable>
          </View>
        </View>

        {/* Medi Bud Health Score Gauge (Apple Health Inset Style) */}
        <HealthScore
          score={healthScore}
          maxScore={100}
          showPremiumLock={false}
          hydrationPercent={hydrationPercent}
          dietPercent={dietPercent}
          habitsPercent={habitsPercent}
          onPressGoal={() => router.push('/(tabs)/track')}
        />

        {/* Apple iOS 4-Column Action Grid */}
        <View style={styles.actionGrid}>
          <Pressable
            onPress={() => router.push('/meal/scan')}
            style={({ pressed }) => [styles.actionTile, pressed && styles.tilePressed]}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <MaterialCommunityIcons name="camera-iris" size={22} color={COLORS.appleOrange} />
            </View>
            <Text style={styles.actionTileTitle}>Scan Meal</Text>
            <Text style={styles.actionTileSub}>AI Vision</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/diet/plan')}
            style={({ pressed }) => [styles.actionTile, pressed && styles.tilePressed]}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <MaterialCommunityIcons name="food-apple" size={22} color={COLORS.appleGreen} />
            </View>
            <Text style={styles.actionTileTitle}>7-Day Diet</Text>
            <Text style={styles.actionTileSub}>Indian Plan</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/report/upload')}
            style={({ pressed }) => [styles.actionTile, pressed && styles.tilePressed]}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#E1F5FE' }]}>
              <Feather name="file-text" size={20} color={COLORS.appleBlue} />
            </View>
            <Text style={styles.actionTileTitle}>Upload Lab</Text>
            <Text style={styles.actionTileSub}>RAG Insights</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/care/nearby')}
            style={({ pressed }) => [styles.actionTile, pressed && styles.tilePressed]}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#FFEBEE' }]}>
              <Feather name="crosshair" size={20} color={COLORS.appleRed} />
            </View>
            <Text style={styles.actionTileTitle}>Local Care</Text>
            <Text style={styles.actionTileSub}>Hospitals</Text>
          </Pressable>
        </View>

        {/* Hydration Tracker */}
        <WaterTrackerCard
          intakeMl={waterIntakeMl}
          goalMl={waterGoalMl}
          streakDays={waterStreakDays}
          onAddWater={addWater}
        />

        {/* Daily Vitals Overview */}
        <VitalsCard vitals={vitals} />

        {/* Today's Habits Summary (Apple Inset Card) */}
        <Card style={styles.habitsCard}>
          <SectionHeader
            title="Today's Activity"
            eyebrow="HABIT TRACKING"
            subtitle={`${completedWorkouts} of ${workouts.length} workouts completed`}
            actionText="All"
            onActionPress={() => router.push('/(tabs)/track')}
          />
          <View style={styles.habitsSummaryRow}>
            {workouts.filter((workout) => workout.completed).map((workout) => (
              <View key={workout.id} style={styles.habitBadge}>
                <Feather name="check" size={13} color={COLORS.appleGreen} />
                <Text style={styles.habitBadgeText}>{workout.title} ({workout.durationMinutes}m)</Text>
              </View>
            ))}
            {hydrationPercent >= 75 && (
              <View style={styles.habitBadge}>
                <Feather name="check" size={13} color={COLORS.appleGreen} />
                <Text style={styles.habitBadgeText}>Hydration goal on track</Text>
              </View>
            )}
            {!completedWorkouts && hydrationPercent < 75 && <Text style={styles.emptyHabitText}>Complete a workout or reach 75% hydration to build today’s activity summary.</Text>}
          </View>
        </Card>

        {/* Medical Timeline & Lab Reports */}
        <SectionHeader
          title="Medical Timeline"
          eyebrow="RECORDS & RAG CONTEXT"
          subtitle="Clinical facts synced with your AI companion"
          actionText="Add"
          onActionPress={() => router.push('/report/upload')}
        />
        {reports.map((report) => (
          <ReportTimelineCard key={report.id} report={report} />
        ))}
      </ScrollView>

      {/* Persistent Draggable AI Bottom Sheet */}
      <PersistentBottomSheet />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.systemBackground, // Apple secondary grouped background
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 160,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dateEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  largeTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: TRACKING.display,
    fontFamily: TYPOGRAPHY.displayFont,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  careBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  careBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.appleRed,
    letterSpacing: 0.1,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.appleCard,
  },
  elementPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  actionTile: {
    flex: 1,
    backgroundColor: COLORS.systemCard,
    borderRadius: RADIUS.card,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.appleCard,
  },
  tilePressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTileTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    letterSpacing: TRACKING.subheadline,
  },
  actionTileSub: {
    fontSize: 10.5,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  habitsCard: {
    padding: 20,
    marginBottom: 16,
  },
  habitsSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  habitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  habitBadgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  emptyHabitText: { fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 18 },
});
