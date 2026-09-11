/**
 * Cash Drawer Screen (Sesi Laci Kasir & Rekonsiliasi Kas)
 * Aligned with Section 9.4 & M08 of Laundry-PRD-and-System-Analysis-EN.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/Badge';
import { CashSession, CashExpense } from '../contracts/money';
import { colors, spacing, radius } from '../theme/tokens';

export function CashDrawerScreen() {
  const [activeSession, setActiveSession] = useState<CashSession | null>({
    id: 'cs-001',
    outletId: 'out-01',
    cashierId: 'usr-001',
    openedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    openingFloatIdr: 100000,
    cashReceiptsIdr: 340000,
    authorizedCashInIdr: 0,
    cashRefundsIdr: 0,
    cashExpensesIdr: 25000,
    authorizedCashOutIdr: 0,
    expectedClosingCashIdr: 415000, // 100k + 340k - 25k
    supervisorReviewed: false,
  });

  // Expense modal state
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenses, setExpenses] = useState<CashExpense[]>([
    {
      id: 'exp-1',
      outletId: 'out-01',
      cashSessionId: 'cs-001',
      category: 'SUPPLIES',
      amountIdr: 25000,
      note: 'Beli plastik packing ekstra',
      recordedBy: 'Budi Santoso',
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
  ]);

  // Open Drawer Form
  const [newOpeningFloat, setNewOpeningFloat] = useState('100000');

  // Close Drawer Form
  const [actualCashCount, setActualCashCount] = useState('');

  const handleOpenDrawer = () => {
    const floatNum = parseInt(newOpeningFloat, 10);
    if (isNaN(floatNum) || floatNum < 0) {
      Alert.alert('Error', 'Masukkan modal awal kasir yang valid (Rp)');
      return;
    }

    const session: CashSession = {
      id: `cs-${Date.now()}`,
      outletId: 'out-01',
      cashierId: 'usr-001',
      openedAt: new Date().toISOString(),
      openingFloatIdr: floatNum,
      cashReceiptsIdr: 0,
      authorizedCashInIdr: 0,
      cashRefundsIdr: 0,
      cashExpensesIdr: 0,
      authorizedCashOutIdr: 0,
      expectedClosingCashIdr: floatNum,
      supervisorReviewed: false,
    };
    setActiveSession(session);
    Alert.alert('Berhasil', 'Sesi laci kasir dibuka.');
  };

  const handleAddExpense = () => {
    if (!activeSession) return;
    const amount = parseInt(expenseAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Nominal pengeluaran harus lebih dari 0.');
      return;
    }
    if (!expenseNote.trim()) {
      Alert.alert('Error', 'Keterangan pengeluaran kas kecil wajib diisi.');
      return;
    }

    const newExp: CashExpense = {
      id: `exp-${Date.now()}`,
      outletId: activeSession.outletId,
      cashSessionId: activeSession.id,
      category: 'SUPPLIES',
      amountIdr: amount,
      note: expenseNote.trim(),
      recordedBy: 'Kasir Aktif',
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => [newExp, ...prev]);
    setActiveSession((prev) => {
      if (!prev) return null;
      const newExpensesTotal = prev.cashExpensesIdr + amount;
      return {
        ...prev,
        cashExpensesIdr: newExpensesTotal,
        expectedClosingCashIdr: prev.openingFloatIdr + prev.cashReceiptsIdr - newExpensesTotal,
      };
    });

    setExpenseAmount('');
    setExpenseNote('');
    Alert.alert('Sukses', 'Pengeluaran kas kecil berhasil dicatat.');
  };

  const handleCloseDrawer = () => {
    if (!activeSession) return;
    const actual = parseInt(actualCashCount, 10);
    if (isNaN(actual) || actual < 0) {
      Alert.alert('Error', 'Hitung dan masukkan fisik uang tunai di laci.');
      return;
    }

    const discrepancy = actual - activeSession.expectedClosingCashIdr;

    setActiveSession({
      ...activeSession,
      closedAt: new Date().toISOString(),
      actualClosingCashIdr: actual,
      discrepancyIdr: discrepancy,
    });

    if (discrepancy === 0) {
      Alert.alert('Rekonsiliasi Selesai', 'Uang fisik pas sesuai sistem (Selisih: Rp 0).');
    } else if (discrepancy > 0) {
      Alert.alert(
        'Ada Selisih Lebih',
        `Uang fisik LEBIH Rp ${discrepancy.toLocaleString('id-ID')} dari catatan sistem.`
      );
    } else {
      Alert.alert(
        'Ada Selisih Kurang (Penting)',
        `Uang fisik KURANG Rp ${Math.abs(discrepancy).toLocaleString('id-ID')}. Perlu investigasi supervisor.`
      );
    }
  };

  if (!activeSession || activeSession.closedAt) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Buka Sesi Laci Kasir Baru</Text>
        <Text style={styles.subtitle}>
          Setiap kasir wajib mencatat modal awal (uang kembalian) sebelum mulai transaksi.
        </Text>

        <Card style={styles.card}>
          <Input
            label="Modal Awal Kasir (Rupiah)"
            value={newOpeningFloat}
            onChangeText={setNewOpeningFloat}
            keyboardType="number-pad"
            placeholder="Contoh: 100000"
          />
          <View style={{ marginTop: spacing.md }}>
            <Button label="Buka Laci Kasir" onPress={handleOpenDrawer} />
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Sesi Kasir Aktif</Text>
          <Text style={styles.subtitle}>Outlet: Tebet · Buka: {new Date(activeSession.openedAt).toLocaleTimeString('id-ID')}</Text>
        </View>
        <StatusBadge type="lifecycle" value="ACTIVE" />
      </View>

      {/* Ringkasan Kas Sistem */}
      <Card style={styles.summaryCard}>
        <Text style={styles.sectionHeader}>Rekapitulasi Arus Kas Tunai</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Modal Awal (Kembalian):</Text>
          <Text style={styles.statValue}>Rp {activeSession.openingFloatIdr.toLocaleString('id-ID')}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Tunai Masuk (+):</Text>
          <Text style={[styles.statValue, { color: colors.primary.DEFAULT }]}>
            + Rp {activeSession.cashReceiptsIdr.toLocaleString('id-ID')}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Kas Kecil / Operasional (-):</Text>
          <Text style={[styles.statValue, { color: colors.destructive.DEFAULT }]}>
            - Rp {activeSession.cashExpensesIdr.toLocaleString('id-ID')}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={styles.statTotalLabel}>Ekspektasi Uang di Laci:</Text>
          <Text style={styles.statTotalValue}>
            Rp {activeSession.expectedClosingCashIdr.toLocaleString('id-ID')}
          </Text>
        </View>
      </Card>

      {/* Catat Pengeluaran Kas Kecil */}
      <Card style={styles.card}>
        <Text style={styles.sectionHeader}>Catat Pengeluaran Kas Kecil (Expense)</Text>
        <Input
          label="Nominal (Rupiah)"
          value={expenseAmount}
          onChangeText={setExpenseAmount}
          keyboardType="number-pad"
          placeholder="Contoh: 15000"
        />
        <View style={{ marginTop: spacing.sm }}>
          <Input
            label="Keterangan Pengeluaran"
            value={expenseNote}
            onChangeText={setExpenseNote}
            placeholder="Contoh: Beli sabun darurat / isolasi"
          />
        </View>
        <View style={{ marginTop: spacing.md }}>
          <Button label="Simpan Pengeluaran" variant="secondary" onPress={handleAddExpense} />
        </View>

        {/* Daftar Expense */}
        {expenses.length > 0 && (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.miniHeader}>Riwayat Pengeluaran Sesi Ini:</Text>
            {expenses.map((exp) => (
              <View key={exp.id} style={styles.expenseItem}>
                <Text style={styles.expenseNote}>{exp.note}</Text>
                <Text style={styles.expenseAmount}>- Rp {exp.amountIdr.toLocaleString('id-ID')}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Tutup Kasir & Rekonsiliasi */}
      <Card style={styles.card}>
        <Text style={styles.sectionHeader}>Tutup Kasir & Hitung Fisik Uang</Text>
        <Text style={styles.infoText}>
          Keluarkan seluruh uang tunai dari laci kasir dan hitung secara fisik sebelum submit.
        </Text>
        <Input
          label="Hitungan Fisik Uang Tunai (Rp)"
          value={actualCashCount}
          onChangeText={setActualCashCount}
          keyboardType="number-pad"
          placeholder={`Seharusnya: ${activeSession.expectedClosingCashIdr}`}
        />
        <View style={{ marginTop: spacing.md }}>
          <Button label="Tutup Kasir & Hitung Selisih" variant="destructive" onPress={handleCloseDrawer} />
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  card: {
    marginBottom: spacing.md,
  },
  summaryCard: {
    marginBottom: spacing.md,
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  statTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  statTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary.DEFAULT,
  },
  infoText: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  miniHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
    marginBottom: 6,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  expenseNote: {
    fontSize: 12,
    color: colors.cardForeground,
  },
  expenseAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.destructive.DEFAULT,
  },
});
