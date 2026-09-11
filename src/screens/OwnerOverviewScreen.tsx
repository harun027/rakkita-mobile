/**
 * Owner Overview Dashboard Screen
 * Aligned with Section 2.2, Section 15, and Section 23.2 of Laundry-PRD-and-System-Analysis-EN.md
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Card } from '../components/ui/Card';
import { Order } from '../contracts/order';
import { colors, spacing, radius } from '../theme/tokens';

interface OwnerOverviewScreenProps {
  orders: Order[];
}

export function OwnerOverviewScreen({ orders }: OwnerOverviewScreenProps) {
  // Aggregate financial and operational KPIs
  const stats = useMemo(() => {
    let totalRevenueIdr = 0;
    let totalCollectedReceiptsIdr = 0;
    let totalOutstandingReceivablesIdr = 0;
    let activeOrdersCount = 0;
    let overdueOrdersCount = 0;
    let inCustodyCount = 0;
    let readyCount = 0;

    const now = Date.now();

    orders.forEach((ord) => {
      if (ord.lifecycle === 'ACTIVE') {
        activeOrdersCount++;
        totalRevenueIdr += ord.netChargesIdr;
        totalCollectedReceiptsIdr += ord.netReceiptsIdr;
        totalOutstandingReceivablesIdr += Math.max(0, ord.balanceIdr);

        if (ord.custody === 'IN_CUSTODY') {
          inCustodyCount++;
        }

        const isReady = ord.lines.every((l) => l.currentStage === 'READY');
        if (isReady && ord.custody === 'IN_CUSTODY') {
          readyCount++;
        }

        if (new Date(ord.currentPromisedAt).getTime() < now && ord.custody === 'IN_CUSTODY') {
          overdueOrdersCount++;
        }
      }
    });

    return {
      totalRevenueIdr,
      totalCollectedReceiptsIdr,
      totalOutstandingReceivablesIdr,
      activeOrdersCount,
      overdueOrdersCount,
      inCustodyCount,
      readyCount,
    };
  }, [orders]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard Pemilik (Owner)</Text>
        <Text style={styles.subtitle}>
          Ringkasan omset harian, piutang pelanggan, dan peringatan antrean.
        </Text>
      </View>

      {/* Financial KPIs */}
      <View style={styles.kpiGrid}>
        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Total Omset (Pesanan)</Text>
          <Text style={styles.kpiValue}>
            Rp {stats.totalRevenueIdr.toLocaleString('id-ID')}
          </Text>
        </Card>

        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Uang Masuk (Net)</Text>
          <Text style={[styles.kpiValue, { color: colors.primary.DEFAULT }]}>
            Rp {stats.totalCollectedReceiptsIdr.toLocaleString('id-ID')}
          </Text>
        </Card>

        <Card style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Piutang Belum Lunas</Text>
          <Text style={[styles.kpiValue, { color: colors.destructive.DEFAULT }]}>
            Rp {stats.totalOutstandingReceivablesIdr.toLocaleString('id-ID')}
          </Text>
        </Card>
      </View>

      {/* Operational Queues */}
      <Text style={styles.sectionTitle}>Status Operasional Hari Ini</Text>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total Pesanan Aktif:</Text>
          <Text style={styles.rowValue}>{stats.activeOrdersCount} pesanan</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Cucian Sedang Dikerjakan:</Text>
          <Text style={styles.rowValue}>{stats.inCustodyCount - stats.readyCount} item</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Siap Ambil di Rak:</Text>
          <Text style={[styles.rowValue, { color: colors.primary.DEFAULT }]}>
            {stats.readyCount} pesanan
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Lewat Batas Waktu (Overdue SLA):</Text>
          <Text
            style={[
              styles.rowValue,
              { color: stats.overdueOrdersCount > 0 ? colors.destructive.DEFAULT : colors.cardForeground },
            ]}
          >
            {stats.overdueOrdersCount} pesanan
          </Text>
        </View>
      </Card>

      {/* Outlet Health Info */}
      <Card style={[styles.card, { backgroundColor: '#F8FAFC' }]}>
        <Text style={styles.infoTitle}>Kebijakan Uang & Audit</Text>
        <Text style={styles.infoDesc}>
          • Seluruh mutasi kas dan pengeluaran laci kasir dicatat immutable.{'\n'}
          • Tagihan lunas langsung diverifikasi saat serah terima.{'\n'}
          • Diskon atau penghapusan tagihan hanya dapat disetujui Supervisor / Owner.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  kpiGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiCard: {
    padding: spacing.md,
  },
  kpiLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.cardForeground,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.cardForeground,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
});
