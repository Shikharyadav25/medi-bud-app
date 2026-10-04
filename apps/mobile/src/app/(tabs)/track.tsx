import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { WaterTrackerCard } from '../../components/health/WaterTrackerCard';
import { MealCard } from '../../components/nutrition/MealCard';
import { WorkoutChecklist } from '../../components/fitness/WorkoutChecklist';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useHealthStore } from '../../store/useHealthStore';

export default function TrackScreen() {
  const router = useRouter();
  const {
    waterIntakeMl,
    waterGoalMl,
    calorieGoal,
    waterStreakDays,
    addWater,
    recentMeals,
    workouts,
    toggleWorkout,
    vitals,
    updateVitals,
  } = useHealthStore();

  const [selectedMood, setSelectedMood] = useState<number>(4);
  const [bloodPressure, setBloodPressure] = useState(vitals.bloodPressure === '—' ? '' : vitals.bloodPressure);
  const [heartRate, setHeartRate] = useState(vitals.heartRate ? String(vitals.heartRate) : '');
  const [bloodGlucose, setBloodGlucose] = useState(vitals.bloodGlucose === '—' ? '' : vitals.bloodGlucose.replace(/\s*mg\/dL/i, ''));
  const [spo2, setSpo2] = useState(vitals.spo2 ? String(vitals.spo2) : '');

  const totalCaloriesToday = recentMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalProteinToday = recentMeals.reduce((acc, m) => acc + m.proteinG, 0);

  const saveVitals = () => {
    const heart = Number(heartRate);
    const oxygen = Number(spo2);
    if (bloodPressure && !/^\d{2,3}\/\d{2,3}$/.test(bloodPressure)) {
      Alert.alert('Check blood pressure', 'Use systolic/diastolic format, for example 120/80.');
      return;
    }
    if ((heartRate && (heart < 30 || heart > 220)) || (spo2 && (oxygen < 70 || oxygen > 100))) {
      Alert.alert('Check vital values', 'Heart rate must be 30–220 bpm and SpO₂ must be 70–100%.');
      return;
    }
    updateVitals({
      bloodPressure: bloodPressure || '—', heartRate: heart || 0,
      bloodGlucose: bloodGlucose ? `${bloodGlucose} mg/dL` : '—', spo2: oxygen || 0,
    });
    Alert.alert('Vitals Saved', 'These user-entered readings are now available as context to your Health AI.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topHeader}>
          <Text style={styles.headerTitle}>Daily Health Trackers</Text>
          <Text style={styles.headerSub}>Consistent tracking fuels personalized AI insights</Text>
        </View>

        {/* 1. Water Tracker */}
        <WaterTrackerCard
          intakeMl={waterIntakeMl}
          goalMl={waterGoalMl}
          streakDays={waterStreakDays}
          onAddWater={addWater}
        />

        <Card style={styles.vitalsEntryCard}>
          <SectionHeader title="Log Today’s Vitals" subtitle="User-entered readings—not device verified" />
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalInput}><Input label="Blood pressure" placeholder="120/80" value={bloodPressure} onChangeText={setBloodPressure} /></View>
            <View style={styles.vitalInput}><Input label="Heart rate (bpm)" placeholder="72" keyboardType="number-pad" value={heartRate} onChangeText={setHeartRate} /></View>
            <View style={styles.vitalInput}><Input label="Glucose (mg/dL)" placeholder="94" keyboardType="decimal-pad" value={bloodGlucose} onChangeText={setBloodGlucose} /></View>
            <View style={styles.vitalInput}><Input label="SpO₂ (%)" placeholder="98" keyboardType="number-pad" value={spo2} onChangeText={setSpo2} /></View>
          </View>
          <Button title="Save Vitals" variant="secondary" onPress={saveVitals} />
        </Card>

        {/* 2. Nutrition Summary & Meals */}
        <SectionHeader
          title="Nutrition & Meals"
          subtitle={`Logged: ${totalCaloriesToday} / ${calorieGoal} kcal • ${totalProteinToday}g protein`}
          actionText="+ Scan Meal"
          onActionPress={() => router.push('/meal/scan')}
        />

        {recentMeals.map((meal) => (
          <MealCard key={meal.id} meal={meal} />
        ))}

        <Button
          title="Scan Next Meal with AI Vision"
          variant="outline"
          icon={<MaterialCommunityIcons name="camera-iris" size={18} color={COLORS.primaryAccent} />}
          onPress={() => router.push('/meal/scan')}
          style={styles.scanMealBtn}
        />

        {/* 3. Workout System */}
        <SectionHeader
          title="Adaptive Workout Plan"
          subtitle="Tailored to your current fitness targets"
        />
        <WorkoutChecklist workouts={workouts} onToggle={toggleWorkout} />

        {/* 4. Sleep Tracker */}
        <Card style={styles.trackerCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconWithTitle}>
              <Feather name="moon" size={18} color={COLORS.primaryAccent} />
              <Text style={styles.cardHeaderTitle}>Sleep & Recovery</Text>
            </View>
            <Text style={styles.cardHeaderSub}>Last night</Text>
          </View>
          <View style={styles.statsRow}>
            <View>
              <Text style={styles.largeStat}>7.5 <Text style={styles.statUnit}>hrs</Text></Text>
              <Text style={styles.statStatus}>Optimal Rest</Text>
            </View>
            <View style={styles.sleepBadge}>
              <Feather name="check" size={14} color="#2E7D32" />
              <Text style={styles.sleepBadgeText}>Restful Quality</Text>
            </View>
          </View>
        </Card>

        {/* 5. Mental Wellness / Daily Mood Check-In */}
        <Card style={styles.trackerCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconWithTitle}>
              <MaterialCommunityIcons name="emoticon-happy-outline" size={20} color={COLORS.secondaryAccent} />
              <Text style={styles.cardHeaderTitle}>Mental Wellness Check-in</Text>
            </View>
            <Text style={styles.cardHeaderSub}>How do you feel?</Text>
          </View>

          <View style={styles.moodRow}>
            {[
              { val: 1, label: 'Low', icon: 'emoticon-sad-outline' },
              { val: 2, label: 'Uneasy', icon: 'emoticon-neutral-outline' },
              { val: 3, label: 'Calm', icon: 'emoticon-outline' },
              { val: 4, label: 'Good', icon: 'emoticon-happy-outline' },
              { val: 5, label: 'Great', icon: 'emoticon-excited-outline' },
            ].map((m) => (
              <TouchableOpacity
                key={m.val}
                activeOpacity={0.8}
                onPress={() => setSelectedMood(m.val)}
                style={[styles.moodItem, selectedMood === m.val && styles.moodItemSelected]}
              >
                <MaterialCommunityIcons
                  name={m.icon as any}
                  size={24}
                  color={selectedMood === m.val ? '#FFFFFF' : COLORS.primaryAccent}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMood === m.val && styles.moodLabelSelected,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      </ScrollView>
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
    paddingBottom: 40,
  },
  vitalsEntryCard: { padding: 18, marginBottom: 16 },
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vitalInput: { flexBasis: '48%', flexGrow: 1 },
  topHeader: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scanMealBtn: {
    marginBottom: 20,
    height: 48,
  },
  trackerCard: {
    padding: 18,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWithTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardHeaderSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  largeStat: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  statStatus: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 2,
  },
  sleepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F8F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  sleepBadgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  moodItem: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundSubtle,
  },
  moodItemSelected: {
    backgroundColor: COLORS.primaryAccent,
  },
  moodLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  moodLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
