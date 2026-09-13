import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, RADIUS, TYPOGRAPHY, TRACKING } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'cta';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const isCta = variant === 'cta' || variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isCta && styles.cta,
        isSecondary && styles.secondary,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        disabled && styles.disabled,
        // Apple active press physics: instant tactile scale down on touch-down
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline || isGhost ? COLORS.primaryAccent : '#FFFFFF'} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.textBase,
              isCta && styles.ctaText,
              isSecondary && styles.secondaryText,
              (isOutline || isGhost) && styles.outlineText,
              disabled && styles.disabledText,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  cta: {
    backgroundColor: COLORS.cta, // #2B2B2B
  },
  secondary: {
    backgroundColor: COLORS.primaryAccent,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.borderActive,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: '#E5E5EA',
    borderColor: '#E5E5EA',
  },
  textBase: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: TRACKING.subheadline,
    fontFamily: TYPOGRAPHY.bodyFont,
  },
  ctaText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  outlineText: {
    color: COLORS.primaryAccent,
  },
  disabledText: {
    color: COLORS.textTertiary,
  },
});
