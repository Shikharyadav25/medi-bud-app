import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';
import { ThisOrThatCard, FoodOption } from '../../components/nutrition/ThisOrThatCard';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';

const PAIRS: Array<{ pairId: string; optionA: FoodOption; optionB: FoodOption }> = [
  {
    pairId: 'pair-1',
    optionA: {
      id: 'dal_roti',
      name: 'Dal + Roti',
      subtitle: 'Homestyle yellow lentils with whole wheat phulkas',
      iconName: 'pot-steam',
      tag: 'Classic Comfort',
    },
    optionB: {
      id: 'paneer_rice',
      name: 'Paneer Rice',
      subtitle: 'Spiced cottage cheese cubes with fragrant basmati',
      iconName: 'bowl-mix',
      tag: 'High Protein',
    },
  },
  {
    pairId: 'pair-2',
    optionA: {
      id: 'idli_sambar',
      name: 'Idli Sambar',
      subtitle: 'Steamed fermented rice cakes with vegetable lentil broth',
      iconName: 'food',
      tag: 'Gut Friendly',
    },
    optionB: {
      id: 'veg_poha',
      name: 'Vegetable Poha',
      subtitle: 'Flattened rice with mustard seeds, peanuts & veggies',
      iconName: 'food-takeout-box',
      tag: 'Light Energy',
    },
  },
  {
    pairId: 'pair-3',
    optionA: {
      id: 'palak_paneer',
      name: 'Palak Paneer',
      subtitle: 'Pureed spinach with soft paneer cubes',
      iconName: 'leaf',
      tag: 'Iron & Calcium',
    },
    optionB: {
      id: 'chana_masala',
      name: 'Chana Masala',
      subtitle: 'Slow-cooked spiced chickpeas with tangy amchur',
      iconName: 'seed',
      tag: 'High Fiber',
    },
  },
  {
    pairId: 'pair-4',
    optionA: {
      id: 'moong_khichdi',
      name: 'Moong Khichdi',
      subtitle: 'Gentle split moong & rice pot with ghee tadka',
      iconName: 'pot-mix',
      tag: 'Easy Digestion',
    },
    optionB: {
      id: 'rajma_chawal',
      name: 'Rajma Chawal',
      subtitle: 'Punjabi red kidney bean curry with steamed rice',
      iconName: 'grain',
      tag: 'Hearty Synergy',
    },
  },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const { updateFoodPreferences } = useAuthStore();
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, FoodOption>>({});

  const currentPair = PAIRS[currentPairIndex];

  const handleSelect = (option: FoodOption) => {
    setSelectedChoices({
      ...selectedChoices,
      [currentPair.pairId]: option,
    });
  };

  const handleNext = () => {
    if (currentPairIndex < PAIRS.length - 1) {
      setCurrentPairIndex(currentPairIndex + 1);
    } else {
      // Finished all pairs
      const chosenNames = Object.values(selectedChoices).map((opt) => opt.name);
      updateFoodPreferences({
        preferred: chosenNames.length > 0 ? chosenNames : ['Dal + Roti', 'Paneer Rice', 'Vegetable Poha'],
        spiciness: 'medium',
      });
      router.push('/(onboarding)/family');
    }
  };

  const selectedForCurrent = selectedChoices[currentPair.pairId]?.id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            Step {currentPairIndex + 1} of {PAIRS.length}
          </Text>
          <Text style={styles.stepTitle}>This or That</Text>
        </View>

        <Text style={styles.headline}>Taste Profiling</Text>
        <Text style={styles.subtext}>
          Choose the Indian dishes you naturally gravitate towards so your meal plans taste like home.
        </Text>

        <ThisOrThatCard
          optionA={currentPair.optionA}
          optionB={currentPair.optionB}
          selectedId={selectedForCurrent}
          onSelect={handleSelect}
        />

        <View style={styles.ctaContainer}>
          <Button
            title={currentPairIndex < PAIRS.length - 1 ? 'Next Comparison' : 'Complete Preference Profile'}
            variant="cta"
            disabled={!selectedForCurrent}
            onPress={handleNext}
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
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  stepTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
  ctaContainer: {
    marginTop: 16,
  },
});
