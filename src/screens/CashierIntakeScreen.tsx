import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { NumberKeypad } from '../components/ui/NumberKeypad';
import {
  calculateBillableGrams,
  calculateLineGrossIdr,
  formatRupiah,
  formatWeight,
} from '../core/pricing';
import { colors, spacing, radius } from '../theme/tokens';
import { ServiceSnapshot } from '../contracts/order';

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

export const CashierIntakeScreen: React.FC<{ onOrderCreated?: () => void }> = () => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceSnapshot>(SAMPLE_SERVICES[0]);
  const [weightInputGrams, setWeightInputGrams] = useState('2350');
  const [bagCount, setBagCount] = useState('1');
  const [depositInput, setDepositInput] = useState('10000');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleConfirmOrder = () => {
    if (!customerName.trim()) {
      Alert.alert('Validasi', 'Nama pelanggan wajib diisi.');
      return;
    }
    if (actualGrams <= 0) {
      Alert.alert('Validasi', 'Berat pakaian harus lebih dari 0 gram.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Order Berhasil Dibuat',
        `No Order: ORD-20260910-001\nPelanggan: ${customerName}\nTotal: ${formatRupiah(
          quote.grossIdr
        )}\nDP Diterima: ${formatRupiah(depositIdr)}\nSisa: ${formatRupiah(
          remainingBalanceIdr
        )}\n\nKantung: ${bagCount} label disiapkan.`,
        [
          {
            text: 'Cetak Label & Resi',
            onPress: () => {
              setCustomerName('');
              setCustomerPhone('');
              setWeightInputGrams('0');
            },
          },
        ]
      );
    }, 800);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.outletBadge}>
          <Text style={styles.outletText}>📍 Outlet Cabang 1 — Kasir Aktif</Text>
        </View>

        {/* 1. Customer Section */}
        <Card>
          <Text style={styles.sectionTitle}>1. Data Pelanggan</Text>
          <Input
            label="Nama Pelanggan *"
            placeholder="Cth: Budi Santoso"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <Input
            label="No. WhatsApp (Opsional)"
            placeholder="08123456789"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            helperText="Diperlukan untuk kirim bukti tracking via WhatsApp"
          />
        </Card>

        {/* 2. Service Selection */}
        <Card>
          <Text style={styles.sectionTitle}>2. Pilih Layanan</Text>
          <View style={styles.serviceList}>
            {SAMPLE_SERVICES.map((srv) => {
              const isSelected = selectedService.id === srv.id;
              return (
                <TouchableOpacity
                  key={srv.id}
                  style={[styles.serviceButton, isSelected && styles.serviceButtonActive]}
                  onPress={() => setSelectedService(srv)}
                >
                  <Text
                    style={[styles.serviceName, isSelected && styles.serviceNameActive]}
                  >
                    {srv.name}
                  </Text>
                  <Text
                    style={[styles.servicePrice, isSelected && styles.servicePriceActive]}
                  >
                    {formatRupiah(srv.pricePerUnitIdr)}/{srv.unit === 'PER_KG' ? 'kg' : 'pcs'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Weight Keypad for Kg */}
          {selectedService.unit === 'PER_KG' && (
            <>
              <Text style={[styles.subLabel, { marginTop: spacing.md }]}>
                Timbang Berat (Gram)
              </Text>
              <NumberKeypad
                value={weightInputGrams}
                onValueChange={setWeightInputGrams}
                unitLabel="gram"
              />
              <View style={styles.weightNoteBox}>
                <Text style={styles.weightNoteText}>
                  Aktual: {formatWeight(actualGrams)} | Ditagih:{' '}
                  {formatWeight(quote.billableGrams)} (Min:{' '}
                  {formatWeight(selectedService.minimumGrams || 0)})
                </Text>
              </View>
            </>
          )}

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Input
                label="Jumlah Kantong"
                keyboardType="numeric"
                value={bagCount}
                onChangeText={setBagCount}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="Uang Muka / DP (IDR)"
                keyboardType="numeric"
                value={depositInput}
                onChangeText={setDepositInput}
                prefix="Rp"
              />
            </View>
          </View>
        </Card>

        {/* 3. Pricing Summary & Commit */}
        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>3. Ringkasan Tagihan</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Tagihan (C)</Text>
            <Text style={styles.summaryValue}>{formatRupiah(quote.grossIdr)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pembayaran DP (N)</Text>
            <Text style={styles.summaryValue}>{formatRupiah(depositIdr)}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Sisa Tagihan Saat Ambil</Text>
            <Text
              style={[
                styles.summaryTotalValue,
                remainingBalanceIdr > 0 ? styles.colorUnpaid : styles.colorSettled,
              ]}
            >
              {formatRupiah(remainingBalanceIdr)}
            </Text>
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <Button
              label={isSubmitting ? 'Menyimpan Order...' : 'Konfirmasi & Buat Order'}
              onPress={handleConfirmOrder}
              loading={isSubmitting}
              size="lg"
            />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  outletBadge: {
    backgroundColor: colors.primary.light,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  outletText: {
    color: colors.primary.dark,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  serviceList: {
    gap: 8,
  },
  serviceButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  serviceButtonActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  serviceNameActive: {
    color: colors.primary.dark,
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.mutedForeground,
  },
  servicePriceActive: {
    color: colors.primary.dark,
  },
  weightNoteBox: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginVertical: 4,
  },
  weightNoteText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.primary.DEFAULT,
    borderWidth: 1.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  colorUnpaid: {
    color: colors.destructive.DEFAULT,
  },
  colorSettled: {
    color: colors.primary.DEFAULT,
  },
});
