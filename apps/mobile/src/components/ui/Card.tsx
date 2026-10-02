import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'flat' | 'inset' | 'dark';
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
}) => {
  const cardStyle = [
    styles.base,
    variant === 'default' && styles.default,
    variant === 'flat' && styles.flat,
    variant === 'inset' && styles.inset,
    variant === 'dark' && styles.dark,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.card,
    padding: 18,
    backgroundColor: COLORS.systemCard,
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: COLORS.borderSubtle,
  },
  default: {
    ...SHADOWS.appleCard,
  },
  flat: {
    shadowOpacity: 0,
    elevation: 0,
  },
  inset: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0,
    ...SHADOWS.appleCard,
  },
  dark: {
    backgroundColor: '#1C1C1E',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
});
