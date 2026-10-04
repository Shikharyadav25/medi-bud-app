import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Button } from '../../components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={[COLORS.backgroundSkyTop, COLORS.backgroundSkyBottom]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          {/* Top-left: small pixel-mosaic wellness glyph in deep slate blue */}
          <View style={styles.glyphContainer}>
            <View style={styles.glyphGrid}>
              <View style={[styles.glyphPixel, { backgroundColor: COLORS.primaryAccent }]} />
              <View style={[styles.glyphPixel, { backgroundColor: COLORS.primaryAccent }]} />
              <View style={[styles.glyphPixel, { backgroundColor: 'transparent' }]} />
              <View style={[styles.glyphPixel, { backgroundColor: COLORS.primaryAccent }]} />
            </View>
          </View>

          {/* Headline: "Better health starts here" (Rounded serif font 32-40px tight line height) */}
          <Text style={styles.headline}>Better health starts here</Text>

          {/* Three-column feature row */}
          <View style={styles.featuresRow}>
            <View style={styles.featureCol}>
              <View style={styles.featureIconCircle}>
                <Feather name="activity" size={20} color={COLORS.primaryAccent} />
              </View>
              <Text style={styles.featureText}>Track vitals</Text>
            </View>

            <View style={styles.featureCol}>
              <View style={styles.featureIconCircle}>
                <MaterialCommunityIcons name="creation" size={20} color={COLORS.secondaryAccent} />
              </View>
              <Text style={styles.featureText}>Get insights</Text>
            </View>

            <View style={styles.featureCol}>
              <View style={styles.featureIconCircle}>
                <Feather name="check-circle" size={20} color="#2E7D32" />
              </View>
              <Text style={styles.featureText}>Build habits</Text>
            </View>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <View style={styles.taglineCard}>
            <MaterialCommunityIcons name="creation" size={18} color={COLORS.secondaryAccent} />
            <Text style={styles.poweredText}>
              All in one app, powered by your AI Health Coach
            </Text>
          </View>

          {/* Full-width dark charcoal CTA: #2B2B2B, 56px height, 16px corner radius */}
          <Button
            title="Start your journey"
            variant="cta"
            onPress={() => router.push('/(auth)/login')}
            style={styles.ctaButton}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  topSection: {
    paddingTop: 40,
  },
  glyphContainer: {
    marginBottom: 28,
  },
  glyphGrid: {
    width: 32,
    height: 32,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  glyphPixel: {
    width: 13,
    height: 13,
    borderRadius: 3,
  },
  headline: {
    fontSize: 38,
    fontWeight: '700',
    color: COLORS.primaryDark,
    lineHeight: 44,
    letterSpacing: -0.5,
    fontFamily: TYPOGRAPHY.serifHeading,
    marginBottom: 44,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.card,
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
  },
  featureCol: {
    flex: 1,
    alignItems: 'center',
  },
  featureIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.backgroundSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.sansBody,
  },
  bottomSection: {
    paddingBottom: 24,
    gap: 16,
  },
  taglineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
  },
  poweredText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  ctaButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.cta, // #2B2B2B
  },
});
