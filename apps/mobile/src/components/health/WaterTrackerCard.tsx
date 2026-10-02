import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY, TRACKING } from '../../constants/theme';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

interface WaterTrackerCardProps {
  intakeMl: number;
  goalMl: number;
  streakDays: number;
  onAddWater: (amountMl: number) => void;
  onScanBottle?: () => void;
}

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({
  intakeMl,
  goalMl,
  streakDays,
  onAddWater,
  onScanBottle,
}) => {
  const progress = Math.min(1, intakeMl / goalMl);
  const percentage = Math.round(progress * 100);

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="water" size={18} color={COLORS.appleBlue} />
          </View>
          <View>
            <Text style={styles.eyebrow}>HYDRATION</Text>
            <Text style={styles.title}>Water Tracker</Text>
          </View>
        </View>

        <View style={styles.streakBadge}>
          <Feather name="zap" size={12} color={COLORS.appleOrange} />
          <Text style={styles.streakText}>{streakDays}d Streak</Text>
        </View>
      </View>

      <View style={styles.intakeStatsRow}>
        <View style={styles.numberWrapper}>
          <Text style={styles.largeNumber}>{intakeMl.toLocaleString()}</Text>
          <Text style={styles.unitText}>ml</Text>
        </View>
        <Text style={styles.goalSubtext}>of {goalMl.toLocaleString()} ml goal ({percentage}%)</Text>
      </View>

      <ProgressBar
        progress={progress}
        color={COLORS.appleBlue}
        backgroundColor="#E1F5FE"
        height={9}
        style={styles.progressBar}
      />

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onAddWater(250)}
          style={({ pressed }) => [styles.quickAddButton, pressed && styles.buttonPressed]}
        >
          <Ionicons name="add" size={16} color={COLORS.appleBlue} />
          <Text style={styles.quickAddText}>+250 ml</Text>
        </Pressable>

        <Pressable
          onPress={() => onAddWater(500)}
          style={({ pressed }) => [styles.quickAddButton, pressed && styles.buttonPressed]}
        >
          <Ionicons name="add" size={16} color={COLORS.appleBlue} />
          <Text style={styles.quickAddText}>+500 ml</Text>
        </Pressable>

        {onScanBottle && (
          <Pressable
            onPress={onScanBottle}
            style={({ pressed }) => [styles.scanButton, pressed && styles.buttonPressed]}
          >
            <Feather name="camera" size={14} color={COLORS.primaryAccent} />
            <Text style={styles.scanText}>Verify</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    backgroundColor: '#E1F5FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: TRACKING.subheadline,
    fontFamily: TYPOGRAPHY.displayFont,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  streakText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.appleOrange,
  },
  intakeStatsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  numberWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  largeNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -1,
    fontFamily: TYPOGRAPHY.displayFont,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 3,
  },
  goalSubtext: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  progressBar: {
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#B3E5FC',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    gap: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  quickAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.appleBlue,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.systemFill,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  scanText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
});
