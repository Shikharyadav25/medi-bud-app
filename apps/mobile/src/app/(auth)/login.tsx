import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setProfile, resetToDemoUser } = useAuthStore();
  const [identifier, setIdentifier] = useState('+919876543210');
  const [password, setPassword] = useState('password123');

  const handleLogin = () => {
    resetToDemoUser();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="heart-pulse" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to access your personalized health companion</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Phone Number or Health ID"
            placeholder="e.g. +91 98765 43210"
            value={identifier}
            onChangeText={setIdentifier}
            leftIcon={<Feather name="phone" size={18} color={COLORS.textSecondary} />}
          />

          <Input
            label="Password or OTP"
            placeholder="Enter password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            leftIcon={<Feather name="lock" size={18} color={COLORS.textSecondary} />}
          />

          <Button
            title="Sign In"
            variant="cta"
            onPress={handleLogin}
            style={styles.signInBtn}
          />

          <Button
            title="Explore Demo Account (Aarav, 21)"
            variant="outline"
            onPress={handleLogin}
            style={styles.demoBtn}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
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
    paddingTop: 40,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primaryDark,
    fontFamily: TYPOGRAPHY.serifHeading,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  form: {
    marginBottom: 24,
  },
  signInBtn: {
    marginTop: 8,
    marginBottom: 12,
  },
  demoBtn: {
    borderColor: COLORS.primaryAccent,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
});
