import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../ui/Card';
import { WorkoutItem } from '../../types/health';

interface WorkoutChecklistProps {
  workouts: WorkoutItem[];
  onToggle: (id: string) => void;
}

export const WorkoutChecklist: React.FC<WorkoutChecklistProps> = ({ workouts, onToggle }) => {
  const completedCount = workouts.filter((w) => w.completed).length;
  const totalCount = workouts.length;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Workout Checklist</Text>
          <Text style={styles.headerSubtitle}>
            {completedCount} of {totalCount} completed today
          </Text>
        </View>

        <View style={styles.progressCircle}>
          <Text style={styles.progressText}>
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {workouts.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.75}
            onPress={() => onToggle(item.id)}
            style={[styles.itemRow, item.completed && styles.itemRowCompleted]}
          >
            <View style={[styles.checkbox, item.completed && styles.checkboxCompleted]}>
              {item.completed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>

            <View style={styles.itemInfo}>
              <Text style={[styles.itemTitle, item.completed && styles.itemTitleCompleted]}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <Feather name="clock" size={12} color={COLORS.textMuted} />
                <Text style={styles.durationText}>{item.durationMinutes} mins</Text>
                <Text style={styles.categoryBadge}>• {item.category}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 18,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.sansBody,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.backgroundSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryAccent,
  },
  list: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFF',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
  },
  itemRowCompleted: {
    backgroundColor: '#F0F8F2',
    borderColor: 'rgba(46, 125, 50, 0.2)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.sansBody,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  durationText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  categoryBadge: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
