import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

export interface NumberKeypadProps {
  onValueChange: (val: string) => void;
  value: string;
  unitLabel?: string;
  allowDecimal?: boolean;
}

export const NumberKeypad: React.FC<NumberKeypadProps> = ({
  onValueChange,
  value,
  unitLabel = 'gram',
  allowDecimal = false,
}) => {
  const handlePress = (char: string) => {
    if (char === 'DEL') {
      onValueChange(value.length > 1 ? value.slice(0, -1) : '0');
      return;
    }
    if (char === 'CLR') {
      onValueChange('0');
      return;
    }
    if (char === '.' && !allowDecimal) return;
    if (char === '.' && value.includes('.')) return;

    if (value === '0' && char !== '.') {
      onValueChange(char);
    } else {
      onValueChange(value + char);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];

  return (
    <View style={styles.container}>
      <View style={styles.displayArea}>
        <Text style={styles.displayNumber}>{value || '0'}</Text>
        <Text style={styles.displayUnit}>{unitLabel}</Text>
      </View>
      <View style={styles.grid}>
        {keys.map((k) => {
          const isAction = k === 'DEL' || k === 'CLR';
          return (
            <TouchableOpacity
              key={k}
              activeOpacity={0.6}
              onPress={() => handlePress(k)}
              style={[styles.key, isAction && styles.actionKey]}
              accessibilityRole="button"
              accessibilityLabel={`Tombol ${k}`}
            >
              <Text style={[styles.keyText, isAction && styles.actionKeyText]}>{k}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  displayArea: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  displayNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.cardForeground,
    fontVariant: ['tabular-nums'],
  },
  displayUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginLeft: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  key: {
    width: '31%',
    height: 52,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  actionKey: {
    backgroundColor: '#E2E8F0',
  },
  actionKeyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
});
