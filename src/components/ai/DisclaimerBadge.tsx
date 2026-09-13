import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';

export const DisclaimerBadge: React.FC = () => {
  return (
    <View style={styles.container}>
      <Feather name="info" size={13} color={COLORS.textMuted} style={styles.icon} />
      <Text style={styles.text}>
        AI can make mistakes, so always double check important health information with a qualified healthcare professional.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(43, 58, 85, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginVertical: 8,
    gap: 8,
  },
  icon: {
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
});
