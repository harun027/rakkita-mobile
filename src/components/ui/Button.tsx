import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = styles.base;

    // Sizes
    if (size === 'sm') base = { ...base, paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 };
    if (size === 'md') base = { ...base, paddingVertical: 12, paddingHorizontal: 16, minHeight: spacing.touchMin };
    if (size === 'lg') base = { ...base, paddingVertical: 14, paddingHorizontal: 20, minHeight: 48 };

    // Variants
    switch (variant) {
      case 'secondary':
        return { ...base, backgroundColor: colors.muted };
      case 'outline':
        return { ...base, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border };
      case 'destructive':
        return { ...base, backgroundColor: colors.destructive.DEFAULT };
      case 'ghost':
        return { ...base, backgroundColor: 'transparent' };
      default:
        return { ...base, backgroundColor: colors.primary.DEFAULT };
    }
  };

  const getLabelStyle = (): TextStyle => {
    let color = colors.primary.foreground;
    if (variant === 'secondary') color = colors.cardForeground;
    if (variant === 'outline' || variant === 'ghost') color = colors.cardForeground;
    if (variant === 'destructive') color = colors.destructive.foreground;

    return {
      ...styles.label,
      fontSize: size === 'sm' ? 13 : 15,
      color: disabled ? colors.mutedForeground : color,
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        getContainerStyle(),
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? colors.primary.DEFAULT : '#FFF'} />
      ) : (
        <>
          {icon}
          <Text style={[getLabelStyle(), textStyle]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
