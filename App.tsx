import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { CashierIntakeScreen } from './src/screens/CashierIntakeScreen';
import { OrderCard } from './src/components/domain/OrderCard';
import { Order } from './src/contracts/order';
import { colors, radius, spacing } from './src/theme/tokens';
import { Button } from './src/components/ui/Button';
import { StatusBadge } from './src/components/ui/Badge';
import { Card } from './src/components/ui/Card';

// Sample active orders for Workboard & Collection
const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-1',
    orderNumber: 'ORD-20260910-001',
    tenantId: 'ten-1',
    outletId: 'out-1',
    customer: { id: 'c1', tenantId: 'ten-1', name: 'Ibu Siti Aminah', phone: '+628123456789' },
    lifecycle: 'ACTIVE',
    custody: 'IN_CUSTODY',
    settlement: 'PARTIAL',
    blockingIssue: 'NONE',
    initialChargesIdr: 24000,
    debitAdjustmentsIdr: 0,
    creditAdjustmentsIdr: 0,
    netChargesIdr: 24000,
    confirmedReceiptsIdr: 10000,
    confirmedRefundsIdr: 0,
    correctingReversalsIdr: 0,
    netReceiptsIdr: 10000,
    balanceIdr: 14000,
    createdAt: new Date().toISOString(),
    originalPromisedAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    currentPromisedAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    lines: [
      {
        lineId: 'l1',
        service: {
          id: 'srv-1',
          name: 'Cuci Kering Setrika Reguler',
          unit: 'PER_KG',
          pricePerUnitIdr: 8000,
          minimumGrams: 3000,
          incrementGrams: 100,
          slaHours: 48,
          defaultWorkflow: ['QUEUED', 'WASHING', 'DRYING', 'IRONING', 'QC', 'READY'],
        },
        actualGrams: 2350,
        billableGrams: 3000,
        quantity: 1,
        unitPriceIdr: 8000,
        lineGrossIdr: 24000,
        dueAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        workflowSnapshot: ['QUEUED', 'WASHING', 'DRYING', 'IRONING', 'QC', 'READY'],
        currentStage: 'WASHING',
        bags: [{ bagId: 'BAG-001', orderId: 'ord-1', lineId: 'l1', labelCount: 1 }],
      },
    ],
    finalPackages: [],
  },
  {
    id: 'ord-2',
    orderNumber: 'ORD-20260909-082',
    tenantId: 'ten-1',
    outletId: 'out-1',
    customer: { id: 'c2', tenantId: 'ten-1', name: 'Pak Rudi Hartono', phone: '+628198765432' },
    lifecycle: 'ACTIVE',
    custody: 'IN_CUSTODY',
    settlement: 'SETTLED',
    blockingIssue: 'NONE',
    initialChargesIdr: 50000,
    debitAdjustmentsIdr: 0,
    creditAdjustmentsIdr: 0,
    netChargesIdr: 50000,
    confirmedReceiptsIdr: 50000,
    confirmedRefundsIdr: 0,
    correctingReversalsIdr: 0,
    netReceiptsIdr: 50000,
    balanceIdr: 0,
    createdAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    originalPromisedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    currentPromisedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    firstReadyAt: new Date().toISOString(),
    currentReadyAt: new Date().toISOString(),
    lines: [
      {
        lineId: 'l2',
        service: {
          id: 'srv-2',
          name: 'Bedcover Besar',
          unit: 'PER_PIECE',
          pricePerUnitIdr: 50000,
          slaHours: 24,
          defaultWorkflow: ['QUEUED', 'WASHING', 'DRYING', 'QC', 'READY'],
        },
        actualGrams: 0,
        billableGrams: 0,
        quantity: 2,
        unitPriceIdr: 25000,
        lineGrossIdr: 50000,
        dueAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        workflowSnapshot: ['QUEUED', 'WASHING', 'DRYING', 'QC', 'READY'],
        currentStage: 'READY',
        bags: [{ bagId: 'BAG-042', orderId: 'ord-2', lineId: 'l2', labelCount: 2 }],
      },
    ],
    finalPackages: [
      {
        packageId: 'PKG-082',
        orderId: 'ord-2',
        rackLocation: 'RAK-A3',
        itemCount: 2,
        packedAt: new Date().toISOString(),
        packedBy: 'Operator 1',
      },
    ],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'intake' | 'production' | 'collection'>('intake');
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);

  const handleAdvanceStage = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const line = ord.lines[0];
        if (!line) return ord;

        const stages = line.workflowSnapshot;
        const currentIndex = stages.indexOf(line.currentStage);
        const nextStage = stages[Math.min(stages.length - 1, currentIndex + 1)] || 'READY';

        return {
          ...ord,
          lines: [
            {
              ...line,
              currentStage: nextStage,
            },
          ],
        };
      })
    );
  };

  const handleHandover = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              custody: 'HANDED_OVER',
              handedOverAt: new Date().toISOString(),
              handedOverTo: 'Pelanggan Langsung',
            }
          : ord
      )
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>LaundryFlow / Rakkita</Text>
          <Text style={styles.headerSubtitle}>Sistem Operasional Laundry Multi-Outlet</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Kasir / Operator</Text>
        </View>
      </View>

      {/* Main Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'intake' && styles.tabItemActive]}
          onPress={() => setActiveTab('intake')}
        >
          <Text style={[styles.tabLabel, activeTab === 'intake' && styles.tabLabelActive]}>
            1. Kasir Intake
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'production' && styles.tabItemActive]}
          onPress={() => setActiveTab('production')}
        >
          <Text style={[styles.tabLabel, activeTab === 'production' && styles.tabLabelActive]}>
            2. Produksi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'collection' && styles.tabItemActive]}
          onPress={() => setActiveTab('collection')}
        >
          <Text style={[styles.tabLabel, activeTab === 'collection' && styles.tabLabelActive]}>
            3. Pengambilan
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      {activeTab === 'intake' && <CashierIntakeScreen />}

      {activeTab === 'production' && (
        <ScrollView contentContainerStyle={styles.scrollArea}>
          <Text style={styles.heading}>Antrean Kerja Operator (Sort Deadline)</Text>
          {orders.map((ord) => (
            <Card key={ord.id} style={{ marginBottom: spacing.md }}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderTitle}>
                  {ord.orderNumber} · {ord.customer.name}
                </Text>
                <StatusBadge type="stage" value={ord.lines[0]?.currentStage || 'QUEUED'} />
              </View>

              <Text style={styles.serviceText}>
                {ord.lines[0]?.service.name} ({ord.lines[0]?.bags[0]?.bagId || 'Kantung'})
              </Text>

              <View style={styles.stageActions}>
                <Button
                  size="sm"
                  label={`Lanjut Tahap Berikutnya`}
                  onPress={() => handleAdvanceStage(ord.id)}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      )}

      {activeTab === 'collection' && (
        <ScrollView contentContainerStyle={styles.scrollArea}>
          <Text style={styles.heading}>Pengambilan Paket (Handover)</Text>
          {orders.map((ord) => (
            <View key={ord.id} style={{ marginBottom: spacing.md }}>
              <OrderCard order={ord} />
              {ord.custody === 'IN_CUSTODY' && (
                <View style={{ marginTop: 6 }}>
                  <Button
                    label={
                      ord.balanceIdr > 0
                        ? 'Pelunasan & Serah Terima'
                        : 'Serahkan Semua Paket'
                    }
                    variant={ord.balanceIdr > 0 ? 'secondary' : 'default'}
                    onPress={() => handleHandover(ord.id)}
                  />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.DEFAULT,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  roleBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary.DEFAULT,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabLabelActive: {
    color: colors.primary.DEFAULT,
  },
  scrollArea: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  serviceText: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginVertical: 4,
  },
  stageActions: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
});
