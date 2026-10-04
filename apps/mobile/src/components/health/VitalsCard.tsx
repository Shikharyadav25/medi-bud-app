import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY, TRACKING } from '../../constants/theme';
import { Card } from '../ui/Card';
import { DailyVitals } from '../../types/health';

interface VitalsCardProps {
  vitals: DailyVitals;
}

export const VitalsCard: React.FC<VitalsCardProps> = ({ vitals }) => {
  const hasBloodPressure = !!vitals.bloodPressure && vitals.bloodPressure !== '—';
  const hasHeartRate = vitals.heartRate > 0;
  const hasGlucose = !!vitals.bloodGlucose && vitals.bloodGlucose !== '—';
  const hasSpo2 = vitals.spo2 > 0;
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>HEALTH METRICS</Text>
          <Text style={styles.headerTitle}>Daily Vitals</Text>
        </View>
        <Text style={styles.updatedText}>{vitals.lastUpdated || 'Today'}</Text>
      </View>

      <View style={styles.grid}>
        {/* Blood Pressure */}
        <View style={styles.vitalBox}>
          <View style={styles.iconTitleRow}>
            <View style={[styles.miniIcon, { backgroundColor: '#FFEBEE' }]}>
              <MaterialCommunityIcons name="heart-pulse" size={14} color={COLORS.appleRed} />
            </View>
            <Text style={styles.vitalLabel}>Blood Pressure</Text>
          </View>
          <Text style={styles.vitalValue}>{hasBloodPressure ? vitals.bloodPressure : '—'}</Text>
          <Text style={styles.vitalUnit}>{hasBloodPressure ? 'mmHg • Logged' : 'Not logged'}</Text>
        </View>

        {/* Heart Rate */}
        <View style={styles.vitalBox}>
          <View style={styles.iconTitleRow}>
            <View style={[styles.miniIcon, { backgroundColor: '#FFF3E0' }]}>
              <Feather name="activity" size={13} color={COLORS.appleOrange} />
            </View>
            <Text style={styles.vitalLabel}>Resting Heart</Text>
          </View>
          <Text style={styles.vitalValue}>{hasHeartRate ? vitals.heartRate : '—'}</Text>
          <Text style={styles.vitalUnit}>{hasHeartRate ? 'bpm • Logged' : 'Not logged'}</Text>
        </View>

        {/* Blood Glucose */}
        <View style={styles.vitalBox}>
          <View style={styles.iconTitleRow}>
            <View style={[styles.miniIcon, { backgroundColor: '#E1F5FE' }]}>
              <MaterialCommunityIcons name="water-percent" size={14} color={COLORS.appleBlue} />
            </View>
            <Text style={styles.vitalLabel}>Fasting Glucose</Text>
          </View>
          <Text style={styles.vitalValue}>{hasGlucose ? vitals.bloodGlucose : '—'}</Text>
          <Text style={styles.vitalUnit}>{hasGlucose ? 'User-entered reading' : 'Not logged'}</Text>
        </View>

        {/* SpO2 */}
        <View style={styles.vitalBox}>
          <View style={styles.iconTitleRow}>
            <View style={[styles.miniIcon, { backgroundColor: '#E8F5E9' }]}>
              <Feather name="shield" size={13} color={COLORS.appleGreen} />
            </View>
            <Text style={styles.vitalLabel}>Oxygen SpO2</Text>
          </View>
          <Text style={styles.vitalValue}>{hasSpo2 ? `${vitals.spo2}%` : '—'}</Text>
          <Text style={styles.vitalUnit}>{hasSpo2 ? 'Logged saturation' : 'Not logged'}</Text>
        </View>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  eyebrow: {
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
  updatedText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  vitalBox: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderSubtle,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  miniIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalLabel: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  vitalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
    fontFamily: TYPOGRAPHY.displayFont,
  },
  vitalUnit: {
    fontSize: 11,
    color: COLORS.appleGreen,
    fontWeight: '500',
    marginTop: 2,
  },
});
