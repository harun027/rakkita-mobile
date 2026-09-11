import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius } from '../../theme/tokens';
import { CustodyStatus, OrderLifecycle, SettlementStatus, WorkItemStage, BlockingIssueStatus } from '../../contracts/order';

export interface StatusBadgeProps {
  type: 'lifecycle' | 'custody' | 'settlement' | 'stage' | 'issue';
  value: OrderLifecycle | CustodyStatus | SettlementStatus | WorkItemStage | BlockingIssueStatus;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, style }) => {
  const getBadgeMeta = (): { bg: string; text: string; border: string; label: string } => {
    switch (value) {
      // Blocking Issue
      case 'OPEN':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', label: 'Ada Kendala' };
      case 'RESOLVED':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', label: 'Kendala Selesai' };
      // Settlement (Money)
      case 'UNPAID':
        return { ...colors.status.unpaid, label: 'Belum Bayar' };
      case 'PARTIAL':
        return { ...colors.status.partial, label: 'DP / Sebagian' };
      case 'SETTLED':
        return { ...colors.status.settled, label: 'Lunas' };
      case 'CREDIT_DUE':
        return { ...colors.status.creditDue, label: 'Kredit/Kelebihan' };
      
      // Physical Fulfillment
      case 'IN_CUSTODY':
        return { ...colors.status.inCustody, label: 'Dalam Outlet' };
      case 'HANDED_OVER':
        return { ...colors.status.handedOver, label: 'Sudah Diambil' };
      case 'RETURNED_ON_CANCEL':
        return { ...colors.status.cancelled, label: 'Batal & Dikembalikan' };

      // Work Item Stage
      case 'QUEUED':
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', label: 'Antrean' };
      case 'WASHING':
        return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', label: 'Cuci' };
      case 'DRYING':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', label: 'Pengeringan' };
      case 'IRONING':
        return { bg: '#FCE7F3', text: '#BE185D', border: '#FBCFE8', label: 'Setrika' };
      case 'FOLDING':
        return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE', label: 'Lipat' };
      case 'QC':
        return { bg: '#FEF9C3', text: '#A16207', border: '#FEF08A', label: 'Pemeriksaan QC' };
      case 'READY':
        return { ...colors.status.readyForCollection, label: 'Siap Diambil' };

      // Lifecycle
      case 'ACTIVE':
        return { ...colors.status.active, label: 'Aktif' };
      case 'CANCELLED':
        return { ...colors.status.cancelled, label: 'Dibatalkan' };
      case 'DRAFT':
      default:
        return { ...colors.status.draft, label: 'Draft' };
    }
  };

  const meta = getBadgeMeta();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: meta.bg, borderColor: meta.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: meta.text }]}>{meta.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
