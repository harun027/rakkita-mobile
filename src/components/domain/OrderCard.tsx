import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Order } from '../../contracts/order';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/Badge';
import { formatRupiah, formatWeight } from '../../core/pricing';
import { colors, spacing } from '../../theme/tokens';

export interface OrderCardProps {
  order: Order;
  onPress?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const totalWeightGrams = order.lines.reduce((acc, l) => acc + l.actualGrams, 0);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.customerName}>{order.customer.name}</Text>
          </View>
          <View style={styles.statusBadges}>
            <StatusBadge type="custody" value={order.custody} />
            <StatusBadge type="settlement" value={order.settlement} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <View>
            <Text style={styles.metaLabel}>Layanan ({order.lines.length})</Text>
            <Text style={styles.metaValue}>
              {order.lines[0]?.service.name}{' '}
              {order.lines.length > 1 ? `+${order.lines.length - 1}` : ''}
            </Text>
            {totalWeightGrams > 0 && (
              <Text style={styles.weightNote}>{formatWeight(totalWeightGrams)}</Text>
            )}
          </View>

          <View style={styles.rightAlign}>
            <Text style={styles.metaLabel}>Sisa Tagihan</Text>
            <Text
              style={[
                styles.balanceText,
                order.balanceIdr > 0 ? styles.balanceUnpaid : styles.balanceSettled,
              ]}
            >
              {order.balanceIdr > 0 ? formatRupiah(order.balanceIdr) : 'Lunas'}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.deadlineText}>
            Tenggat: {new Date(order.currentPromisedAt).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text style={styles.bagCount}>
            {order.lines.reduce((acc, l) => acc + l.bags.length, 0)} Kantong
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  customerName: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  statusBadges: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
    marginTop: 2,
  },
  weightNote: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  balanceUnpaid: {
    color: colors.destructive.DEFAULT,
  },
  balanceSettled: {
    color: colors.primary.DEFAULT,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  deadlineText: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: '500',
  },
  bagCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
  },
});
