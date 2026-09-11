import React from 'react';
import { View, Text, TextInput, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad' | 'decimal-pad' | 'number-pad';
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  prefix?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  helperText,
  error,
  keyboardType = 'default',
  containerStyle,
  inputStyle,
  prefix,
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        {prefix && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          accessibilityLabel={label || placeholder}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: spacing.touchMin,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.destructive.DEFAULT,
  },
  prefix: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.cardForeground,
    paddingVertical: 10,
  },
  helperText: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.destructive.DEFAULT,
    marginTop: 4,
    fontWeight: '500',
  },
});
