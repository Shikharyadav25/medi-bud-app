import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';

export default function HealthDataScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();

  const [name, setName] = useState(profile.name || 'Aarav');
  const [phone, setPhone] = useState(profile.phone || '+919876543210');
  const [healthId, setHealthId] = useState(profile.healthId || '91-4523-8871-0021');

  const handleContinue = () => {
    setProfile({
      name: name.trim() || 'Aarav',
      phone: phone.trim() || '+919876543210',
      healthId: healthId.trim() || '91-4523-8871-0021',
    });
    router.push('/(onboarding)/goals');
  };

  const handleSkip = () => {
    router.push('/(onboarding)/assistant-preview');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Top-right "Skip for now >" */}
          <View style={styles.topBar}>
            <TouchableOpacity activeOpacity={0.7} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip for now &gt;</Text>
            </TouchableOpacity>
          </View>

          {/* Headline & Subtext */}
          <Text style={styles.headline}>Connect Health Data</Text>
          <View style={styles.subtextRow}>
            <Text style={styles.subtext}>
              Fetching data linked to {phone.slice(0, 5)}XXXXXX{phone.slice(-2)}
            </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Feather name="edit-2" size={14} color={COLORS.primaryAccent} />
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.formContainer}>
            <Input
              label="Your Full Name"
              placeholder="Enter name"
              value={name}
              onChangeText={setName}
              leftIcon={<Feather name="user" size={18} color={COLORS.textSecondary} />}
            />

            <Input
              label="Phone Number"
              placeholder="Enter phone number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              leftIcon={<Feather name="phone" size={18} color={COLORS.textSecondary} />}
            />

            <Input
              label="ABHA Health ID (Optional)"
              placeholder="Enter Health ID (e.g. 14-digit ABHA)"
              value={healthId}
              onChangeText={setHealthId}
              leftIcon={<Feather name="credit-card" size={18} color={COLORS.textSecondary} />}
            />
          </View>

          {/* Security Section */}
          <View style={styles.securityCard}>
            <View style={styles.securityHeader}>
              <Feather name="shield" size={18} color="#2E7D32" />
              <Text style={styles.securityTitle}>Your data is 100% secure</Text>
            </View>
            <Text style={styles.securityDisclaimer}>
              We use your data only to provide personalized insights and apply strong security measures to protect it.
            </Text>
          </View>

          {/* CTA */}
          <View style={styles.ctaContainer}>
            <Button
              title="Continue"
              variant="cta"
              onPress={handleContinue}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  topBar: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
    marginBottom: 8,
  },
  subtextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 28,
  },
  subtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.sansBody,
  },
  formContainer: {
    marginBottom: 16,
  },
  securityCard: {
    backgroundColor: '#F7FAFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
    marginBottom: 24,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  securityTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  securityDisclaimer: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  ctaContainer: {
    marginTop: 8,
  },
});
