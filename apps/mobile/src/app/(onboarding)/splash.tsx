import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../constants/theme';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(onboarding)/welcome');
    }, 2400);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => router.replace('/(onboarding)/welcome')}
      style={styles.container}
    >
      <View style={styles.centerContent}>
        {/* Brand Mark: Abstract heartbeat/pulse motif in slate blue + white */}
        <View style={styles.pulseContainer}>
          <View style={styles.pulseOuterGlow}>
            <View style={styles.pulseInnerCircle}>
              <MaterialCommunityIcons name="heart-pulse" size={56} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <Text style={styles.brandTitle}>MEDI BUD</Text>
        <Text style={styles.tagline}>"Your Health, Understood"</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.securityRow}>
          <Feather name="shield" size={16} color="#4FC3F7" />
          <Text style={styles.securityText}>Private by design</Text>
        </View>
        <Text style={styles.trustedText}>Educational wellness prototype</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDark, // #0A0A0A
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseContainer: {
    marginBottom: 28,
  },
  pulseOuterGlow: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(43, 58, 85, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pulseInnerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryAccent, // #2B3A55 slate blue
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FAFAFA',
    letterSpacing: 2,
    fontFamily: TYPOGRAPHY.serifHeading,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#A0A6B2',
    fontStyle: 'italic',
    fontFamily: TYPOGRAPHY.sansBody,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FAFAFA',
  },
  trustedText: {
    fontSize: 12,
    color: '#717886',
  },
});
