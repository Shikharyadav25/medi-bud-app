import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../ui/Card';
import { MealItem } from '../../types/health';

interface MealCardProps {
  meal: MealItem;
}

export const MealCard: React.FC<MealCardProps> = ({ meal }) => {
  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{meal.mealType}</Text>
        </View>
        <Text style={styles.timestamp}>{meal.timestamp}</Text>
      </View>

      <Text style={styles.name}>{meal.name}</Text>

      {meal.isEstimated && (
        <View style={styles.estimatedRow}>
          <MaterialCommunityIcons name="scale" size={13} color={COLORS.secondaryAccent} />
          <Text style={styles.estimatedText}>Nutritional values estimated by AI</Text>
        </View>
      )}

      <View style={styles.macrosRow}>
        <View style={styles.macroBox}>
          <Text style={styles.macroValue}>{meal.calories}</Text>
          <Text style={styles.macroLabel}>kcal</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroBox}>
          <Text style={styles.macroValue}>{meal.proteinG}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroBox}>
          <Text style={styles.macroValue}>{meal.carbsG}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
        </View>
        <View style={styles.macroDivider} />
        <View style={styles.macroBox}>
          <Text style={styles.macroValue}>{meal.fatG}g</Text>
          <Text style={styles.macroLabel}>Fats</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: COLORS.backgroundSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryAccent,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.sansBody,
    marginBottom: 6,
  },
  estimatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  estimatedText: {
    fontSize: 11,
    color: COLORS.secondaryAccent,
    fontStyle: 'italic',
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F7FAFF',
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    marginTop: 4,
  },
  macroBox: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  macroLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  macroDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(43, 58, 85, 0.1)',
  },
});
