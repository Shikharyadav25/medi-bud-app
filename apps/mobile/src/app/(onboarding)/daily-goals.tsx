import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/useAuthStore';
import { useHealthStore } from '../../store/useHealthStore';

export default function DailyGoalsScreen() {
  const router = useRouter();
  const { profile, completeOnboarding } = useAuthStore();
  const { setDailyGoals } = useHealthStore();
  const suggestedCalories = useMemo(() => {
    const base = profile.gender === 'Female' ? 1400 : 1600;
    return Math.round((base + profile.weightKg * 8 + profile.heightCm * 2 - profile.age * 5) / 50) * 50;
  }, [profile]);
  const suggestedWater = Math.max(1800, Math.min(4000, Math.round((profile.weightKg * 35) / 100) * 100));
  const [calories, setCalories] = useState(String(suggestedCalories));
  const [water, setWater] = useState(String(suggestedWater));
  const [error, setError] = useState('');

  const finish = () => {
    const calorieValue = Number(calories);
    const waterValue = Number(water);
    if (calorieValue < 1000 || calorieValue > 5000 || waterValue < 1000 || waterValue > 6000) {
      setError('Choose 1,000–5,000 kcal and 1,000–6,000 ml. Ask a clinician for therapeutic targets.');
      return;
    }
    setDailyGoals(calorieValue, waterValue);
    completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>STEP 5 OF 5</Text>
        <Text style={styles.title}>Set today’s targets</Text>
        <Text style={styles.subtitle}>Start with our general wellness estimate, then adjust it to match guidance from your doctor or dietitian.</Text>

        <View style={styles.suggestionCard}>
          <Feather name="zap" size={20} color={COLORS.secondaryAccent} />
          <View style={styles.suggestionCopy}>
            <Text style={styles.suggestionTitle}>Personalized starting point</Text>
            <Text style={styles.suggestionText}>Based on age, height, weight, and profile—not a medical prescription.</Text>
          </View>
        </View>

        <Input label="Daily calorie target (kcal)" keyboardType="number-pad" value={calories} onChangeText={setCalories} leftIcon={<Feather name="target" size={18} color={COLORS.textSecondary} />} />
        <Input label="Daily water target (ml)" keyboardType="number-pad" value={water} onChangeText={setWater} leftIcon={<Feather name="droplet" size={18} color={COLORS.textSecondary} />} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button title="Open My Dashboard" variant="cta" onPress={finish} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  step: { fontSize: 12, fontWeight: '700', color: COLORS.primaryAccent, letterSpacing: 0.8, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '700', color: COLORS.primaryDark, fontFamily: TYPOGRAPHY.serifHeading, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 22 },
  suggestionCard: { flexDirection: 'row', backgroundColor: '#FFF9E8', borderRadius: RADIUS.lg, padding: 16, marginBottom: 24, gap: 10 },
  suggestionCopy: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  suggestionText: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, marginTop: 3 },
  error: { color: COLORS.statusDanger, fontSize: 12.5, marginBottom: 12 },
});
