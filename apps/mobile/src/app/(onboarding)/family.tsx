import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Button } from '../../components/ui/Button';
import { Chip } from '../../components/ui/Chip';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../store/useAuthStore';
import type { FamilyMember } from '../../types/user';

type Relation = FamilyMember['relation'];

export default function FamilyOnboardingScreen() {
  const router = useRouter();
  const { addFamilyMember } = useAuthStore();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState<Relation>('Parent');
  const [error, setError] = useState('');

  const saveAndContinue = () => {
    if (!name.trim()) {
      setError('Enter a family member’s name, or choose Skip for now.');
      return;
    }
    const ageValue = Number(age);
    if (ageValue < 1 || ageValue > 120) {
      setError('Enter an age between 1 and 120.');
      return;
    }
    addFamilyMember({
      id: `family-${Date.now()}`,
      name: name.trim(),
      relation,
      age: ageValue,
      phone: phone.trim() || undefined,
      uniqueFamilyId: `MB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      permissions: { profile: true, reports: false, medications: false, vitals: true, plans: true },
    });
    router.push('/(onboarding)/daily-goals');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>STEP 4 OF 5</Text>
        <Text style={styles.title}>Build your family circle</Text>
        <Text style={styles.subtitle}>Connect one trusted person now. Report and medication access stays off until you explicitly enable it.</Text>

        <View style={styles.trustCard}>
          <Feather name="shield" size={20} color="#2E7D32" />
          <Text style={styles.trustText}>New connections can see your basic profile, vitals, and wellness plans—not private reports.</Text>
        </View>

        <Input label="Family member name" placeholder="e.g. Sunita Sharma" value={name} onChangeText={setName} leftIcon={<Feather name="user" size={18} color={COLORS.textSecondary} />} />
        <Text style={styles.label}>Relationship</Text>
        <View style={styles.chips}>
          {(['Parent', 'Spouse', 'Child', 'Sibling', 'Other'] as Relation[]).map((item) => <Chip key={item} label={item} selected={relation === item} onPress={() => setRelation(item)} />)}
        </View>
        <Input label="Age" placeholder="e.g. 52" keyboardType="number-pad" value={age} onChangeText={setAge} />
        <Input label="Phone (optional)" placeholder="+91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button title="Connect & Continue" variant="cta" onPress={saveAndContinue} />
        <Button title="Skip for now" variant="ghost" onPress={() => router.push('/(onboarding)/daily-goals')} style={styles.skip} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  step: { fontSize: 12, fontWeight: '700', color: COLORS.primaryAccent, letterSpacing: 0.8, marginBottom: 8 },
  title: { fontSize: 29, fontWeight: '700', color: COLORS.primaryDark, fontFamily: TYPOGRAPHY.serifHeading, marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 18 },
  trustCard: { flexDirection: 'row', gap: 10, backgroundColor: '#F1F8F3', borderRadius: RADIUS.lg, padding: 14, marginBottom: 22 },
  trustText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: COLORS.textPrimary },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  error: { color: COLORS.statusDanger, fontSize: 12.5, marginBottom: 12 },
  skip: { marginTop: 6 },
});
