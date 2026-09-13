import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';

const GOAL_OPTIONS = [
  'Fitness & Strength',
  'Nutrition Optimization',
  'Healthy Aging',
  'Cardiovascular Wellness',
  'Blood Sugar Management',
  'Better Sleep & Recovery',
  'Mental Wellness & Positivity',
];

const DIET_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Eggetarian',
  'Non-Vegetarian',
  'Jain (No Root Veggies)',
];

export default function GoalsScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();

  const [selectedGoals, setSelectedGoals] = useState<string[]>(
    profile.healthGoals.length > 0 ? profile.healthGoals : ['Fitness & Strength', 'Nutrition Optimization']
  );
  const [selectedDiet, setSelectedDiet] = useState<string[]>(
    profile.dietaryPreferences.length > 0 ? profile.dietaryPreferences : ['Vegetarian']
  );

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const selectDiet = (diet: string) => {
    setSelectedDiet([diet]);
  };

  const handleContinue = () => {
    setProfile({
      healthGoals: selectedGoals,
      dietaryPreferences: selectedDiet,
    });
    router.push('/(onboarding)/preferences');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headline}>Personalize Your Journey</Text>
        <Text style={styles.subtext}>
          Medi Bud adapts its recommendations to your lifestyle and health priorities.
        </Text>

        <Text style={styles.sectionTitle}>What are your primary goals?</Text>
        <View style={styles.chipRow}>
          {GOAL_OPTIONS.map((goal) => (
            <Chip
              key={goal}
              label={goal}
              selected={selectedGoals.includes(goal)}
              onPress={() => toggleGoal(goal)}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>Dietary Category</Text>
        <View style={styles.chipRow}>
          {DIET_OPTIONS.map((diet) => (
            <Chip
              key={diet}
              label={diet}
              selected={selectedDiet.includes(diet)}
              onPress={() => selectDiet(diet)}
            />
          ))}
        </View>

        <View style={styles.bmiCard}>
          <Text style={styles.bmiTitle}>Baseline Profile for Aarav</Text>
          <Text style={styles.bmiStats}>
            Age: {profile.age} • Height: {profile.heightCm} cm • Weight: {profile.weightKg} kg (BMI: {profile.bmi})
          </Text>
        </View>

        <View style={styles.ctaContainer}>
          <Button
            title="Continue to Food Preferences"
            variant="cta"
            onPress={handleContinue}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  bmiCard: {
    backgroundColor: COLORS.backgroundSubtle,
    padding: 16,
    borderRadius: RADIUS.md,
    marginTop: 8,
    marginBottom: 28,
  },
  bmiTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryAccent,
    marginBottom: 4,
  },
  bmiStats: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  ctaContainer: {
    marginTop: 8,
  },
});
