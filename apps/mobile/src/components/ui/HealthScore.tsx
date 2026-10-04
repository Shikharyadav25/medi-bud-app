import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY, TRACKING, SHADOWS } from '../../constants/theme';
import { Card } from './Card';

interface HealthScoreProps {
  score?: number;
  maxScore?: number;
  showPremiumLock?: boolean;
  onPressGoal?: () => void;
  hydrationPercent?: number;
  dietPercent?: number;
  habitsPercent?: number;
}

export const HealthScore: React.FC<HealthScoreProps> = ({
  score = 82,
  maxScore = 100,
  showPremiumLock = true,
  onPressGoal,
  hydrationPercent = 85,
  dietPercent = 80,
  habitsPercent = 82,
}) => {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="heart-pulse" size={18} color={COLORS.appleRed} />
          </View>
          <View>
            <Text style={styles.headerEyebrow}>DAILY WELLNESS GAUGE</Text>
            <Text style={styles.headerTitle}>Medi Bud Health Score</Text>
          </View>
        </View>

        {showPremiumLock && (
          <View style={styles.premiumBadge}>
            <Feather name="lock" size={11} color="#FFFFFF" />
            <Text style={styles.premiumText}>Pro</Text>
          </View>
        )}
      </View>

      <View style={styles.scoreRow}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreNumber}>{score}</Text>
          <Text style={styles.scoreMax}>/{maxScore}</Text>
        </View>

        <Pressable
          onPress={onPressGoal}
          style={({ pressed }) => [styles.goalButton, pressed && styles.goalButtonPressed]}
        >
          <Text style={styles.goalText}>View Trends</Text>
          <Feather name="chevron-right" size={15} color={COLORS.primaryAccent} />
        </Pressable>
      </View>

      {/* Smooth Apple Capsule Progress Track */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${percentage}%` }]} />
      </View>

      {/* Apple Health Metric Breakdown Pills */}
      <View style={styles.factorsRow}>
        <View style={[styles.factorPill, { backgroundColor: '#E1F5FE' }]}>
          <Feather name="droplet" size={12} color={COLORS.appleBlue} />
          <Text style={[styles.factorLabel, { color: COLORS.appleBlue }]}>Hydration {hydrationPercent}%</Text>
        </View>
        <View style={[styles.factorPill, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={12} color={COLORS.appleGreen} />
          <Text style={[styles.factorLabel, { color: COLORS.appleGreen }]}>Diet {dietPercent}%</Text>
        </View>
        <View style={[styles.factorPill, { backgroundColor: '#FFF3E0' }]}>
          <Feather name="activity" size={12} color={COLORS.appleOrange} />
          <Text style={[styles.factorLabel, { color: COLORS.appleOrange }]}>Habits {habitsPercent}%</Text>
        </View>
      </View>

      <Text style={styles.disclaimerText}>
        Your score reflects your recent wellness habits and is not a clinical assessment.
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: TRACKING.subheadline,
    fontFamily: TYPOGRAPHY.displayFont,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.cta,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: RADIUS.full,
  },
  premiumText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1.5, // Apple tight negative display tracking
    fontFamily: TYPOGRAPHY.displayFont,
  },
  scoreMax: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginLeft: 3,
    fontWeight: '500',
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.systemFill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    gap: 2,
  },
  goalButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryAccent,
    letterSpacing: TRACKING.subheadline,
  },
  progressTrack: {
    height: 9,
    backgroundColor: '#E5E5EA',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primaryAccent,
    borderRadius: RADIUS.full,
  },
  factorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  factorPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  factorLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  disclaimerText: {
    fontSize: 11.5,
    color: COLORS.textTertiary,
    lineHeight: 15,
  },
});
