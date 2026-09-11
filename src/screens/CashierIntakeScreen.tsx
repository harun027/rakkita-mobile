import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { NumberKeypad } from '../components/ui/NumberKeypad';
import { StatusBadge } from '../components/ui/Badge';
import {
  calculateBillableGrams,
  calculateLineGrossIdr,
  formatRupiah,
  formatWeight,
} from '../core/pricing';
import { colors, spacing, radius } from '../theme/tokens';
import { ServiceSnapshot, Order } from '../contracts/order';
import { parseScannedCode } from '../core/qrParser';
import { ReceiptModal } from '../components/domain/ReceiptModal';

// Default service catalog snapshot (Section 7.1 FR04)
const SAMPLE_SERVICES: ServiceSnapshot[] = [
  {
    id: 'srv-ck',
    name: 'Cuci Kering Setrika Reguler',
    unit: 'PER_KG',
    pricePerUnitIdr: 8000,
    minimumGrams: 3000,
    incrementGrams: 100,
    slaHours: 48,
    defaultWorkflow: ['QUEUED', 'WASHING', 'DRYING', 'IRONING', 'QC', 'READY'],
  },
  {
    id: 'srv-exp',
    name: 'Cuci Kilat Express 24 Jam',
    unit: 'PER_KG',
    pricePerUnitIdr: 12000,
    minimumGrams: 3000,
    incrementGrams: 100,
    slaHours: 24,
    defaultWorkflow: ['QUEUED', 'WASHING', 'DRYING', 'IRONING', 'QC', 'READY'],
  },
  {
    id: 'srv-sp',
    name: 'Bedcover Besar',
    unit: 'PER_PIECE',
    pricePerUnitIdr: 25000,
    slaHours: 48,
    defaultWorkflow: ['QUEUED', 'WASHING', 'DRYING', 'QC', 'READY'],
  },
];

interface CashierIntakeScreenProps {
  orders?: Order[];
  onOrderCreated?: (order: Order) => void;
  isOffline?: boolean;
}

export const CashierIntakeScreen: React.FC<CashierIntakeScreenProps> = ({
  orders = [],
  onOrderCreated,
  isOffline = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'list'>('create');

  // Create form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceSnapshot>(SAMPLE_SERVICES[0]);
  const [weightInputGrams, setWeightInputGrams] = useState('3000');
  const [bagCount, setBagCount] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [transferRef, setTransferRef] = useState('');
  const [isTransferVerified, setIsTransferVerified] = useState(false);
  const [depositInput, setDepositInput] = useState('10000');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & List state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSettlement, setFilterSettlement] = useState<'ALL' | 'UNPAID' | 'READY'>('ALL');

  // Receipt Modal state
  const [activeReceiptOrder, setActiveReceiptOrder] = useState<Order | null>(null);

  // Deterministic calculation (PRD Section 9.1)
  const actualGrams = parseInt(weightInputGrams, 10) || 0;
  const quote = calculateLineGrossIdr(actualGrams, {
    unit: selectedService.unit,
    pricePerUnitIdr: selectedService.pricePerUnitIdr,
    minimumGrams: selectedService.minimumGrams,
    incrementGrams: selectedService.incrementGrams,
  });

  const depositIdr = parseInt(depositInput, 10) || 0;
  const remainingBalanceIdr = Math.max(0, quote.grossIdr - depositIdr);

  const handleQuickDeposit = (amount: number) => {
    setDepositInput(amount.toString());
  };

  const handleConfirmOrder = () => {
    if (!customerName.trim()) {
      Alert.alert('Validasi', 'Nama pelanggan wajib diisi.');
      return;
    }
    if (selectedService.unit === 'PER_KG' && actualGrams <= 0) {
      Alert.alert('Validasi', 'Berat pakaian harus lebih dari 0 gram.');
      return;
    }

    if (isOffline) {
      Alert.alert(
        'Koneksi Terputus (MB09)',
        'Tidak dapat membuat order baru saat offline. Sistem mencegah pembuatan nota tanpa komit server untuk menghindari selisih data.'
      );
      return;
    }

    // Transfer verification warning per M07
    if (paymentMethod === 'TRANSFER' && depositIdr > 0 && !isTransferVerified) {
      Alert.alert(
        'Konfirmasi Transfer (M07)',
        'Bukti transfer belum diverifikasi mutasi rekening. Apakah Anda yakin ingin mencatat status pembayaran ini sebagai TERTUNDA (Pending)?',
        [
          { text: 'Periksa Dulu', style: 'cancel' },
          { text: 'Tetap Lanjut', onPress: () => proceedOrderCreation(false) },
        ]
      );
      return;
    }

    proceedOrderCreation(paymentMethod === 'CASH' || isTransferVerified);
  };

  const proceedOrderCreation = (paymentVerified: boolean) => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const randomOrderSuffix = Math.floor(100 + Math.random() * 900);
      const newOrderNumber = `ORD-20260911-${randomOrderSuffix}`;
      const countBags = parseInt(bagCount, 10) || 1;

      // When unverified transfer, don't credit receipts yet (PRD M07)
      const confirmedReceipt = paymentVerified ? depositIdr : 0;
      const netBalance = Math.max(0, quote.grossIdr - confirmedReceipt);

      const newOrder: Order = {
        id: `ord-${Date.now()}`,
        orderNumber: newOrderNumber,
        tenantId: 'ten-001',
        outletId: 'out-01',
        customer: {
          id: `c-${Date.now()}`,
          tenantId: 'ten-001',
          name: customerName.trim(),
          phone: customerPhone.trim(),
        },
        lifecycle: 'ACTIVE',
        custody: 'IN_CUSTODY',
        settlement: netBalance === 0 ? 'SETTLED' : confirmedReceipt > 0 ? 'PARTIAL' : 'UNPAID',
        blockingIssue: 'NONE',
        initialChargesIdr: quote.grossIdr,
        debitAdjustmentsIdr: 0,
        creditAdjustmentsIdr: 0,
        netChargesIdr: quote.grossIdr,
        confirmedReceiptsIdr: confirmedReceipt,
        confirmedRefundsIdr: 0,
        correctingReversalsIdr: 0,
        netReceiptsIdr: confirmedReceipt,
        balanceIdr: netBalance,
        createdAt: new Date().toISOString(),
        originalPromisedAt: new Date(Date.now() + selectedService.slaHours * 3600 * 1000).toISOString(),
        currentPromisedAt: new Date(Date.now() + selectedService.slaHours * 3600 * 1000).toISOString(),
        lines: [
          {
            lineId: `line-${Date.now()}`,
            service: selectedService,
            actualGrams: actualGrams,
            billableGrams: quote.billableGrams,
            quantity: 1,
            unitPriceIdr: selectedService.pricePerUnitIdr,
            lineGrossIdr: quote.grossIdr,
            dueAt: new Date(Date.now() + selectedService.slaHours * 3600 * 1000).toISOString(),
            workflowSnapshot: [...selectedService.defaultWorkflow],
            currentStage: 'QUEUED',
            bags: Array.from({ length: countBags }).map((_, idx) => ({
              bagId: `BAG-${randomOrderSuffix}-${idx + 1}`,
              orderId: `ord-${Date.now()}`,
              lineId: `line-${Date.now()}`,
              labelCount: 1,
            })),
          },
        ],
        finalPackages: [],
      };

      onOrderCreated?.(newOrder);

      // Reset form fields
      setCustomerName('');
      setCustomerPhone('');
      setWeightInputGrams('3000');
      setTransferRef('');
      setIsTransferVerified(false);

      // Open receipt modal directly
      setActiveReceiptOrder(newOrder);
    }, 400);
  };

  // Filtered orders for Lookup
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (filterSettlement === 'UNPAID' && ord.balanceIdr <= 0) return false;
      if (filterSettlement === 'READY') {
        const isReady = ord.lines.every((l) => l.currentStage === 'READY');
        if (!isReady || ord.custody !== 'IN_CUSTODY') return false;
      }
      if (!searchQuery.trim()) return true;
      const parsed = parseScannedCode(searchQuery);
      const term = parsed.identifier.toLowerCase();
      return (
        ord.orderNumber.toLowerCase().includes(term) ||
        ord.customer.name.toLowerCase().includes(term) ||
        (ord.customer.phone && ord.customer.phone.includes(term)) ||
        ord.lines.some((l) => l.bags.some((b) => b.bagId.toLowerCase().includes(term)))
      );
    });
  }, [orders, searchQuery, filterSettlement]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sub-Header Navigation */}
      <View style={styles.subNavBar}>
        <TouchableOpacity
          style={[styles.subNavItem, activeSubTab === 'create' && styles.subNavItemActive]}
          onPress={() => setActiveSubTab('create')}
        >
          <Text
            style={[styles.subNavText, activeSubTab === 'create' && styles.subNavTextActive]}
          >
            + Buat Order Baru
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subNavItem, activeSubTab === 'list' && styles.subNavItemActive]}
          onPress={() => setActiveSubTab('list')}
        >
          <Text
            style={[styles.subNavText, activeSubTab === 'list' && styles.subNavTextActive]}
          >
            🔍 Cari & Nota ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeSubTab === 'create' ? (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Customer Section */}
          <Card>
            <Text style={styles.sectionTitle}>1. Data Pelanggan</Text>
            <Input
              placeholder="Nama Lengkap Pelanggan *"
              value={customerName}
              onChangeText={setCustomerName}
            />
            <View style={{ marginTop: spacing.sm }}>
              <Input
                placeholder="No. WhatsApp (08xxxxxxxx)"
                keyboardType="phone-pad"
                value={customerPhone}
                onChangeText={setCustomerPhone}
              />
            </View>
          </Card>

          {/* Service & Weight Section */}
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>2. Layanan & Timbangan</Text>
            <View style={styles.serviceList}>
              {SAMPLE_SERVICES.map((srv) => {
                const isSelected = selectedService.id === srv.id;
                return (
                  <TouchableOpacity
                    key={srv.id}
                    style={[styles.serviceButton, isSelected && styles.serviceButtonActive]}
                    onPress={() => setSelectedService(srv)}
                  >
                    <Text style={[styles.serviceName, isSelected && styles.serviceNameActive]}>
                      {srv.name}
                    </Text>
                    <Text style={[styles.servicePrice, isSelected && styles.servicePriceActive]}>
                      {formatRupiah(srv.pricePerUnitIdr)}/{srv.unit === 'PER_KG' ? 'kg' : 'pcs'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Weight Keypad for Per Kg */}
            {selectedService.unit === 'PER_KG' && (
              <>
                <Text style={[styles.subLabel, { marginTop: spacing.md }]}>
                  Timbang Berat (Gram):
                </Text>
                <NumberKeypad
                  value={weightInputGrams}
                  onValueChange={setWeightInputGrams}
                  unitLabel="gram"
                />
                <View style={styles.weightNoteBox}>
                  <Text style={styles.weightNoteText}>
                    Berat Fisik: {formatWeight(actualGrams)} | Ditagih:{' '}
                    {formatWeight(quote.billableGrams)} (Min:{' '}
                    {formatWeight(selectedService.minimumGrams || 0)})
                  </Text>
                </View>
              </>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Jumlah Kantong Fisik</Text>
                <Input
                  keyboardType="numeric"
                  value={bagCount}
                  onChangeText={setBagCount}
                />
              </View>
            </View>
          </Card>

          {/* Payment & Settlement (PRD M07 & Section 9.1) */}
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.sectionTitle}>3. Pembayaran & Uang Muka</Text>
            
            <View style={styles.paymentMethodRow}>
              <TouchableOpacity
                style={[
                  styles.paymentMethodBtn,
                  paymentMethod === 'CASH' && styles.paymentMethodBtnActive,
                ]}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'CASH' && styles.paymentMethodTextActive,
                  ]}
                >
                  💵 Tunai (Cash)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentMethodBtn,
                  paymentMethod === 'TRANSFER' && styles.paymentMethodBtnActive,
                ]}
                onPress={() => setPaymentMethod('TRANSFER')}
              >
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'TRANSFER' && styles.paymentMethodTextActive,
                  ]}
                >
                  💳 Transfer / QRIS
                </Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === 'TRANSFER' && (
              <View style={styles.transferVerifyBox}>
                <Text style={styles.transferTitle}>Verifikasi Mutasi Rekening (M07)</Text>
                <Input
                  placeholder="Catatan bank / nama pengirim / no. ref"
                  value={transferRef}
                  onChangeText={setTransferRef}
                />
                <TouchableOpacity
                  style={styles.checkVerifyRow}
                  onPress={() => setIsTransferVerified(!isTransferVerified)}
                >
                  <View style={[styles.checkbox, isTransferVerified && styles.checkboxChecked]}>
                    {isTransferVerified && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Sudah dicek masuk ke rekening kasir (Verified)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.fieldLabel}>Nominal DP / Pembayaran Masuk (Rp):</Text>
              <Input
                keyboardType="numeric"
                value={depositInput}
                onChangeText={setDepositInput}
                prefix="Rp"
              />

              <View style={styles.quickDepositRow}>
                <TouchableOpacity
                  style={styles.quickDepositBtn}
                  onPress={() => handleQuickDeposit(quote.grossIdr)}
                >
                  <Text style={styles.quickDepositText}>Lunas (Pas)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDepositBtn}
                  onPress={() => handleQuickDeposit(10000)}
                >
                  <Text style={styles.quickDepositText}>DP 10rb</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDepositBtn}
                  onPress={() => handleQuickDeposit(20000)}
                >
                  <Text style={styles.quickDepositText}>DP 20rb</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDepositBtn}
                  onPress={() => handleQuickDeposit(0)}
                >
                  <Text style={styles.quickDepositText}>Bayar Nanti</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* 4. Pricing Summary & Commit */}
          <Card style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>4. Ringkasan & Cetak Nota</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Tagihan Cucian</Text>
              <Text style={styles.summaryValue}>{formatRupiah(quote.grossIdr)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Uang Masuk Saat Ini</Text>
              <Text style={[styles.summaryValue, { color: colors.primary.DEFAULT }]}>
                {formatRupiah(depositIdr)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Sisa Tagihan Pengambilan</Text>
              <Text
                style={[
                  styles.summaryTotalValue,
                  remainingBalanceIdr > 0 ? styles.colorUnpaid : styles.colorSettled,
                ]}
              >
                {remainingBalanceIdr === 0 ? 'LUNAS' : formatRupiah(remainingBalanceIdr)}
              </Text>
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <Button
                title={isSubmitting ? 'Menyimpan Order...' : 'Konfirmasi & Buat Nota'}
                onPress={handleConfirmOrder}
                loading={isSubmitting}
                style={styles.confirmBtn}
              />
            </View>
          </Card>
        </ScrollView>
      ) : (
        /* Order Lookup List View */
        <View style={styles.listViewContainer}>
          <View style={styles.searchBarBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="🔍 Cari Order No, Pelanggan, atau Kantong..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterSettlement === 'ALL' && styles.filterChipActive,
              ]}
              onPress={() => setFilterSettlement('ALL')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterSettlement === 'ALL' && styles.filterChipTextActive,
                ]}
              >
                Semua ({orders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filterSettlement === 'UNPAID' && styles.filterChipActive,
              ]}
              onPress={() => setFilterSettlement('UNPAID')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterSettlement === 'UNPAID' && styles.filterChipTextActive,
                ]}
              >
                Belum Lunas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                filterSettlement === 'READY' && styles.filterChipActive,
              ]}
              onPress={() => setFilterSettlement('READY')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterSettlement === 'READY' && styles.filterChipTextActive,
                ]}
              >
                Siap Ambil
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.orderListScroll}>
            {filteredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>Tidak Ada Pesanan Ditemukan</Text>
                <Text style={styles.emptyDesc}>
                  Coba kata kunci pencarian lain atau buat order baru.
                </Text>
              </View>
            ) : (
              filteredOrders.map((ord) => (
                <Card key={ord.id} style={styles.orderItemCard}>
                  <View style={styles.orderCardHeader}>
                    <View>
                      <Text style={styles.orderCardNum}>{ord.orderNumber}</Text>
                      <Text style={styles.orderCardCustomer}>{ord.customer.name}</Text>
                    </View>
                    <StatusBadge type="settlement" value={ord.settlement} />
                  </View>

                  <View style={styles.orderCardBody}>
                    <Text style={styles.orderCardService}>
                      {ord.lines.map((l) => l.service.name).join(', ')}
                    </Text>
                    <View style={styles.orderCardMetaRow}>
                      <Text style={styles.orderCardTotal}>
                        Total: {formatRupiah(ord.netChargesIdr)}
                      </Text>
                      <Text
                        style={[
                          styles.orderCardBalance,
                          ord.balanceIdr > 0 ? styles.colorUnpaid : styles.colorSettled,
                        ]}
                      >
                        Sisa: {ord.balanceIdr > 0 ? formatRupiah(ord.balanceIdr) : 'Lunas'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.orderCardFooter}>
                    <StatusBadge type="custody" value={ord.custody} />
                    <Button
                      title="Lihat Nota"
                      variant="outline"
                      onPress={() => setActiveReceiptOrder(ord)}
                      style={styles.viewReceiptBtn}
                    />
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Digital Receipt Modal */}
      <ReceiptModal
        visible={activeReceiptOrder !== null}
        order={activeReceiptOrder}
        onClose={() => setActiveReceiptOrder(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subNavBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subNavItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subNavItemActive: {
    borderBottomColor: colors.primary.DEFAULT,
  },
  subNavText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  subNavTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '700',
  },
  container: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  serviceList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  serviceButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: '47%',
    flex: 1,
  },
  serviceButtonActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  serviceNameActive: {
    color: colors.primary.dark,
    fontWeight: '700',
  },
  servicePrice: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  servicePriceActive: {
    color: colors.primary.dark,
  },
  weightNoteBox: {
    backgroundColor: colors.muted,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  weightNoteText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentMethodBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  paymentMethodBtnActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  paymentMethodTextActive: {
    color: colors.primary.dark,
    fontWeight: '700',
  },
  transferVerifyBox: {
    backgroundColor: colors.muted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  transferTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: 6,
  },
  checkVerifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.mutedForeground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 12,
    color: colors.cardForeground,
  },
  quickDepositRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  quickDepositBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.muted,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDepositText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  summaryCard: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  summaryTotalValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  colorUnpaid: {
    color: colors.destructive.DEFAULT,
  },
  colorSettled: {
    color: colors.primary.DEFAULT,
  },
  confirmBtn: {
    height: 48,
  },
  listViewContainer: {
    flex: 1,
  },
  searchBarBox: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    height: 40,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: colors.cardForeground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  filterChipTextActive: {
    color: colors.primary.dark,
    fontWeight: '700',
  },
  orderListScroll: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  orderItemCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderCardNum: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.cardForeground,
    fontFamily: 'monospace',
  },
  orderCardCustomer: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  orderCardBody: {
    marginVertical: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  orderCardService: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  orderCardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  orderCardTotal: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  orderCardBalance: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  viewReceiptBtn: {
    height: 34,
    paddingHorizontal: spacing.md,
  },
});
