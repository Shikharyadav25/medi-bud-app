import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { useAuthStore } from '../../store/useAuthStore';

type Gender = 'Male' | 'Female' | 'Other';

function bmiLabel(value: number) {
  if (!value) return 'Enter your details';
  if (value < 18.5) return 'Below healthy range';
  if (value < 25) return 'Healthy range';
  if (value < 30) return 'Above healthy range';
  return 'High range';
}

export default function HealthDataScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();
  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '');
  const [weight, setWeight] = useState(profile.weightKg ? String(profile.weightKg) : '');
  const [gender, setGender] = useState<Gender>(profile.gender || 'Other');
  const [error, setError] = useState('');

  const bmi = useMemo(() => {
    const heightM = Number(height) / 100;
    const value = Number(weight) / (heightM * heightM);
    return Number.isFinite(value) && value > 0 ? Number(value.toFixed(1)) : 0;
  }, [height, weight]);

  const handleContinue = () => {
    const ageValue = Number(age);
    const heightValue = Number(height);
    const weightValue = Number(weight);
    if (ageValue < 13 || ageValue > 120 || heightValue < 100 || heightValue > 230 || weightValue < 25 || weightValue > 300) {
      setError('Use realistic values: age 13–120, height 100–230 cm, and weight 25–300 kg.');
      return;
    }
    setProfile({ age: ageValue, heightCm: heightValue, weightKg: weightValue, bmi, gender });
    router.push('/(onboarding)/goals');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.step}>STEP 1 OF 5</Text>
          <Text style={styles.headline}>Let’s calculate your BMI</Text>
          <Text style={styles.subtext}>These basics help tailor calorie, hydration, and activity guidance. You can update them anytime.</Text>

          <Input label="Age" placeholder="e.g. 21" keyboardType="number-pad" value={age} onChangeText={setAge} leftIcon={<Feather name="calendar" size={18} color={COLORS.textSecondary} />} />
          <Input label="Height (cm)" placeholder="e.g. 175" keyboardType="decimal-pad" value={height} onChangeText={setHeight} leftIcon={<Feather name="maximize-2" size={18} color={COLORS.textSecondary} />} />
          <Input label="Weight (kg)" placeholder="e.g. 68" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} leftIcon={<Feather name="activity" size={18} color={COLORS.textSecondary} />} />

          <Text style={styles.label}>Gender</Text>
          <View style={styles.chipRow}>
            {(['Male', 'Female', 'Other'] as Gender[]).map((value) => (
              <Chip key={value} label={value} selected={gender === value} onPress={() => setGender(value)} />
            ))}
          </View>

          <View style={styles.bmiCard}>
            <View>
              <Text style={styles.bmiEyebrow}>YOUR BMI</Text>
              <Text style={styles.bmiValue}>{bmi || '—'}</Text>
            </View>
            <View style={styles.bmiCopy}>
              <Text style={styles.bmiLabel}>{bmiLabel(bmi)}</Text>
              <Text style={styles.bmiNote}>BMI is a screening measure, not a diagnosis.</Text>
            </View>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          <Button title="Save & Continue" variant="cta" onPress={handleContinue} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  step: { fontSize: 12, fontWeight: '700', color: COLORS.primaryAccent, letterSpacing: 0.8, marginBottom: 8 },
  headline: { fontSize: 30, fontWeight: '700', color: COLORS.primaryDark, fontFamily: TYPOGRAPHY.serifHeading, marginBottom: 8 },
  subtext: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 18 },
  bmiCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundSubtle, borderRadius: RADIUS.lg, padding: 18, marginBottom: 12 },
  bmiEyebrow: { fontSize: 10, fontWeight: '700', color: COLORS.primaryAccent, letterSpacing: 0.8 },
  bmiValue: { fontSize: 34, fontWeight: '800', color: COLORS.primaryDark },
  bmiCopy: { flex: 1, marginLeft: 20 },
  bmiLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  bmiNote: { fontSize: 11.5, lineHeight: 16, color: COLORS.textSecondary, marginTop: 3 },
  error: { fontSize: 12.5, color: COLORS.statusDanger, marginBottom: 12 },
});
