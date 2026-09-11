import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import { CashierIntakeScreen } from './src/screens/CashierIntakeScreen';
import { ProductionWorkboardScreen } from './src/screens/ProductionWorkboardScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { CashDrawerScreen } from './src/screens/CashDrawerScreen';
import { OwnerOverviewScreen } from './src/screens/OwnerOverviewScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { Order } from './src/contracts/order';
import { colors, radius, spacing } from './src/theme/tokens';
import { authStore } from './src/services/authStore';
import { UserRole } from './src/contracts/rbac';

// Initial active mock orders
const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: 'ord-1',
    orderNumber: 'ORD-20260910-001',
    tenantId: 'ten-001',
    outletId: 'out-01',
    customer: { id: 'c1', tenantId: 'ten-001', name: 'Ibu Siti Aminah', phone: '08123456789' },
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
    tenantId: 'ten-001',
    outletId: 'out-01',
    customer: { id: 'c2', tenantId: 'ten-001', name: 'Pak Rudi Hartono', phone: '08198765432' },
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
          pricePerUnitIdr: 25000,
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
  const [session, setSession] = useState(authStore.getSession());
  const [activeTab, setActiveTab] = useState<'intake' | 'production' | 'collection' | 'drawer' | 'owner' | 'account'>('intake');
  const [orders, setOrders] = useState<Order[]>(INITIAL_MOCK_ORDERS);
  const [isOutletModalOpen, setIsOutletModalOpen] = useState(false);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);

  useEffect(() => {
    return authStore.subscribe((updated) => setSession(updated));
  }, []);

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
  };

  const handleOrderCreated = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  const handleSwitchOutlet = (outletId: string) => {
    authStore.switchOutlet(outletId);
    setIsOutletModalOpen(false);
  };

  const handleSwitchRole = (role: UserRole) => {
    authStore.switchRole(role);
    setIsOutletModalOpen(false);
  };

  // If unauthenticated, show LoginScreen
  if (!session) {
    return <LoginScreen onLoginSuccess={() => setActiveTab('intake')} />;
  }

  const activeOutlet = authStore.getActiveOutlet();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Network Alert (MB09) */}
      {isOfflineSimulated && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            ⚡ SIMULASI OFFLINE: Transaksi Baru Dinonaktifkan (Section 23.3 MB09)
          </Text>
        </View>
      )}

      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>LaundryFlow / Rakkita</Text>
          <TouchableOpacity onPress={() => setIsOutletModalOpen(true)}>
            <Text style={styles.outletSwitcherLink}>
              📍 {activeOutlet?.outletName || 'Pilih Outlet'} (Ganti ▾)
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.roleBadge}
          onPress={() => setIsOutletModalOpen(true)}
        >
          <Text style={styles.roleText}>{session?.currentRole || 'KASIR'}</Text>
        </TouchableOpacity>
      </View>

      {/* Role-Based Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'intake' && styles.tabItemActive]}
          onPress={() => setActiveTab('intake')}
        >
          <Text style={[styles.tabLabel, activeTab === 'intake' && styles.tabLabelActive]}>
            Kasir
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'production' && styles.tabItemActive]}
          onPress={() => setActiveTab('production')}
        >
          <Text style={[styles.tabLabel, activeTab === 'production' && styles.tabLabelActive]}>
            Produksi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'collection' && styles.tabItemActive]}
          onPress={() => setActiveTab('collection')}
        >
          <Text style={[styles.tabLabel, activeTab === 'collection' && styles.tabLabelActive]}>
            Ambil
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'drawer' && styles.tabItemActive]}
          onPress={() => setActiveTab('drawer')}
        >
          <Text style={[styles.tabLabel, activeTab === 'drawer' && styles.tabLabelActive]}>
            Kas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'owner' && styles.tabItemActive]}
          onPress={() => setActiveTab('owner')}
        >
          <Text style={[styles.tabLabel, activeTab === 'owner' && styles.tabLabelActive]}>
            Owner
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'account' && styles.tabItemActive]}
          onPress={() => setActiveTab('account')}
        >
          <Text style={[styles.tabLabel, activeTab === 'account' && styles.tabLabelActive]}>
            Akun
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen Body */}
      {activeTab === 'intake' && (
        <CashierIntakeScreen
          orders={orders}
          onOrderCreated={handleOrderCreated}
          isOffline={isOfflineSimulated}
        />
      )}

      {activeTab === 'production' && (
        <ProductionWorkboardScreen orders={orders} onUpdateOrder={handleUpdateOrder} />
      )}

      {activeTab === 'collection' && (
        <CollectionScreen
          orders={orders}
          onUpdateOrder={handleUpdateOrder}
          currentUserRole={session?.currentRole}
        />
      )}

      {activeTab === 'drawer' && (
        <CashDrawerScreen />
      )}

      {activeTab === 'owner' && (
        <OwnerOverviewScreen orders={orders} />
      )}

      {activeTab === 'account' && (
        <AccountScreen
          onLogout={() => {}}
          isOfflineSimulated={isOfflineSimulated}
          onToggleOffline={setIsOfflineSimulated}
          onOpenOutletModal={() => setIsOutletModalOpen(true)}
        />
      )}

      {/* Outlet & Role Switcher Modal */}
      <Modal visible={isOutletModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalHeading}>Pilih Outlet & Peran Aktif</Text>
            <Text style={styles.modalSubheading}>
              Mengganti outlet akan menyesuaikan izin akses & antrean kerja (PRD MB02).
            </Text>

            <Text style={styles.groupLabel}>Daftar Outlet Anda:</Text>
            {session?.availableOutlets.map((out) => (
              <TouchableOpacity
                key={out.outletId}
                style={[
                  styles.outletItem,
                  out.outletId === session.activeOutletId && styles.outletItemActive,
                ]}
                onPress={() => handleSwitchOutlet(out.outletId)}
              >
                <View>
                  <Text
                    style={[
                      styles.outletName,
                      out.outletId === session.activeOutletId && styles.outletNameActive,
                    ]}
                  >
                    {out.outletName}
                  </Text>
                  <Text style={styles.outletRole}>Peran: {out.role}</Text>
                </View>
                {out.outletId === session.activeOutletId && (
                  <Text style={styles.activeCheck}>✓ Aktif</Text>
                )}
              </TouchableOpacity>
            ))}

            <Text style={[styles.groupLabel, { marginTop: spacing.md }]}>
              Uji Coba Hak Akses (Role RBAC):
            </Text>
            <View style={styles.roleButtonGroup}>
              {(
                [
                  'OUTLET_CASHIER',
                  'OUTLET_OPERATOR',
                  'OUTLET_SUPERVISOR',
                  'BUSINESS_OWNER',
                ] as UserRole[]
              ).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roleChip,
                    session?.currentRole === r && styles.roleChipActive,
                  ]}
                  onPress={() => handleSwitchRole(r)}
                >
                  <Text
                    style={[
                      styles.roleChipText,
                      session?.currentRole === r && styles.roleChipTextActive,
                    ]}
                  >
                    {r.replace('OUTLET_', '').replace('BUSINESS_', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsOutletModalOpen(false)}
            >
              <Text style={styles.closeBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offlineBanner: {
    backgroundColor: colors.destructive.DEFAULT,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.DEFAULT,
  },
  outletSwitcherLink: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary.DEFAULT,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  tabLabelActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  modalSubheading: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: spacing.xs,
  },
  outletItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xs,
  },
  outletItemActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  outletName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  outletNameActive: {
    color: colors.primary.dark,
    fontWeight: '700',
  },
  outletRole: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  activeCheck: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  roleButtonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  roleChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  roleChipActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  roleChipTextActive: {
    color: colors.primary.dark,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.muted,
    borderRadius: radius.md,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
});
