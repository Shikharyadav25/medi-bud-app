import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS, TYPOGRAPHY } from '../../constants/theme';
import { Card } from '../ui/Card';

export interface FoodOption {
  id: string;
  name: string;
  subtitle: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  tag: string;
}

interface ThisOrThatCardProps {
  optionA: FoodOption;
  optionB: FoodOption;
  selectedId?: string;
  onSelect: (option: FoodOption) => void;
}

export const ThisOrThatCard: React.FC<ThisOrThatCardProps> = ({
  optionA,
  optionB,
  selectedId,
  onSelect,
}) => {
  return (
    <Card style={styles.card}>
      <Text style={styles.prompt}>Which do you prefer?</Text>

      <View style={styles.comparisonContainer}>
        {/* Option A */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelect(optionA)}
          style={[
            styles.optionBox,
            selectedId === optionA.id && styles.selectedOptionBox,
          ]}
        >
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name={optionA.iconName}
              size={26}
              color={selectedId === optionA.id ? '#FFFFFF' : COLORS.primaryAccent}
            />
          </View>
          <Text
            style={[
              styles.optionName,
              selectedId === optionA.id && styles.selectedText,
            ]}
          >
            {optionA.name}
          </Text>
          <Text style={styles.optionSubtitle}>{optionA.subtitle}</Text>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{optionA.tag}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.orBadge}>
          <Text style={styles.orText}>OR</Text>
        </View>

        {/* Option B */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelect(optionB)}
          style={[
            styles.optionBox,
            selectedId === optionB.id && styles.selectedOptionBox,
          ]}
        >
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons
              name={optionB.iconName}
              size={26}
              color={selectedId === optionB.id ? '#FFFFFF' : COLORS.secondaryAccent}
            />
          </View>
          <Text
            style={[
              styles.optionName,
              selectedId === optionB.id && styles.selectedText,
            ]}
          >
            {optionB.name}
          </Text>
          <Text style={styles.optionSubtitle}>{optionB.subtitle}</Text>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{optionB.tag}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
  prompt: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: TYPOGRAPHY.sansBody,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  optionBox: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    borderWidth: 1.5,
    borderColor: 'rgba(43, 58, 85, 0.12)',
    borderRadius: RADIUS.lg,
    padding: 14,
    alignItems: 'center',
  },
  selectedOptionBox: {
    borderColor: COLORS.primaryAccent,
    backgroundColor: '#EEF4FC',
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
  },
  optionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: TYPOGRAPHY.sansBody,
  },
  selectedText: {
    color: COLORS.primaryAccent,
  },
  optionSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(43, 58, 85, 0.08)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  orBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cta,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -8,
    zIndex: 2,
  },
  orText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
