/**
 * Production Workboard Screen
 * Aligned with Section 7.3, Section 14.3, and MB05/MB06 of Laundry-PRD-and-System-Analysis-EN.md
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/Badge';
import { Order, WorkItemStage, FinalPackage } from '../contracts/order';
import { canAdvanceWorkStage } from '../core/stateMachine';
import { parseScannedCode } from '../core/qrParser';
import { colors, spacing, radius } from '../theme/tokens';

interface ProductionWorkboardProps {
  orders: Order[];
  onUpdateOrder: (updatedOrder: Order) => void;
}

export function ProductionWorkboardScreen({ orders, onUpdateOrder }: ProductionWorkboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForQC, setSelectedOrderForQC] = useState<Order | null>(null);
  const [qcRackLocation, setQcRackLocation] = useState('RAK-A1');
  const [qcPackageCount, setQcPackageCount] = useState('1');

  // Issue reporting modal
  const [selectedOrderForIssue, setSelectedOrderForIssue] = useState<Order | null>(null);
  const [issueReason, setIssueReason] = useState('');

  // Filter and sort by deadline (dueAt ascending)
  const activeOrders = useMemo(() => {
    return orders
      .filter((ord) => ord.lifecycle === 'ACTIVE' && ord.custody === 'IN_CUSTODY')
      .filter((ord) => {
        if (!searchQuery.trim()) return true;
        const parsed = parseScannedCode(searchQuery);
        const term = parsed.identifier.toLowerCase();
        const hasOrderNum = ord.orderNumber.toLowerCase().includes(term);
        const hasBag = ord.lines.some((l) =>
          l.bags.some((b) => b.bagId.toLowerCase().includes(term))
        );
        const hasCustomer = ord.customer.name.toLowerCase().includes(term);
        return hasOrderNum || hasBag || hasCustomer;
      })
      .sort((a, b) => {
        const timeA = new Date(a.currentPromisedAt).getTime();
        const timeB = new Date(b.currentPromisedAt).getTime();
        return timeA - timeB;
      });
  }, [orders, searchQuery]);

  const handleAdvanceStage = (order: Order, lineId: string) => {
    const line = order.lines.find((l) => l.lineId === lineId);
    if (!line) return;

    const stages = line.workflowSnapshot;
    const currentIndex = stages.indexOf(line.currentStage);
    const nextStage = stages[currentIndex + 1];

    if (!nextStage) {
      Alert.alert('Info', 'Item sudah di tahap akhir.');
      return;
    }

    // Check if next stage is READY - requires rack & package count input
    if (nextStage === 'READY') {
      setSelectedOrderForQC(order);
      return;
    }

    const check = canAdvanceWorkStage(line.currentStage, nextStage, stages, order.blockingIssue);
    if (!check.allowed) {
      Alert.alert('Gagal Maju Tahap', check.reason);
      return;
    }

    const updatedLines = order.lines.map((l) =>
      l.lineId === lineId ? { ...l, currentStage: nextStage } : l
    );

    onUpdateOrder({
      ...order,
      lines: updatedLines,
    });
  };

  const handleConfirmQCAndPack = () => {
    if (!selectedOrderForQC) return;

    const pkgCount = parseInt(qcPackageCount, 10);
    if (isNaN(pkgCount) || pkgCount <= 0) {
      Alert.alert('Error', 'Jumlah paket harus minimal 1.');
      return;
    }
    if (!qcRackLocation.trim()) {
      Alert.alert('Error', 'Lokasi rak wajib diisi.');
      return;
    }

    const newPackages: FinalPackage[] = Array.from({ length: pkgCount }).map((_, i) => ({
      packageId: `PKG-${selectedOrderForQC.orderNumber.slice(-3)}-${i + 1}`,
      orderId: selectedOrderForQC.id,
      rackLocation: qcRackLocation.trim().toUpperCase(),
      itemCount: 1,
      packedAt: new Date().toISOString(),
      packedBy: 'Operator Produksi',
    }));

    const updatedLines = selectedOrderForQC.lines.map((l) => ({
      ...l,
      currentStage: 'READY' as WorkItemStage,
    }));

    onUpdateOrder({
      ...selectedOrderForQC,
      lines: updatedLines,
      finalPackages: newPackages,
      currentReadyAt: new Date().toISOString(),
      firstReadyAt: selectedOrderForQC.firstReadyAt || new Date().toISOString(),
    });

    setSelectedOrderForQC(null);
    Alert.alert('QC Lolos', `Pesanan siap diambil di ${qcRackLocation.toUpperCase()} (${pkgCount} paket).`);
  };

  const handleReportIssue = () => {
    if (!selectedOrderForIssue) return;
    if (!issueReason.trim()) {
      Alert.alert('Error', 'Alasan kendala wajib diisi.');
      return;
    }

    onUpdateOrder({
      ...selectedOrderForIssue,
      blockingIssue: 'OPEN',
    });

    Alert.alert('Kendala Dicatat', `Pesanan ditandai bermasalah: "${issueReason}". Penyerahan akan diblokir sementara.`);
    setSelectedOrderForIssue(null);
    setIssueReason('');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header & Quick Filter */}
      <View style={styles.header}>
        <Text style={styles.title}>Antrean Kerja Produksi</Text>
        <Text style={styles.subtitle}>
          Urutan prioritas berdasarkan deadline terdekat (SLA).
        </Text>
      </View>

      <Input
        label="Cari / Scan Bag ID atau No. Nota"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Contoh: BAG-001 atau ORD-2026..."
      />

      <View style={{ marginTop: spacing.md }}>
        {activeOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Tidak ada pesanan aktif yang cocok.</Text>
          </Card>
        ) : (
          activeOrders.map((ord) => {
            const line = ord.lines[0];
            const isOverdue = new Date(ord.currentPromisedAt).getTime() < Date.now();

            return (
              <Card key={ord.id} style={[styles.orderCard, isOverdue && styles.overdueCard]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>{ord.orderNumber}</Text>
                    <Text style={styles.customerName}>{ord.customer.name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <StatusBadge type="stage" value={line?.currentStage || 'QUEUED'} />
                    {ord.blockingIssue === 'OPEN' && (
                      <StatusBadge type="issue" value="OPEN" />
                    )}
                  </View>
                </View>

                {/* Line & Bag Details */}
                <View style={styles.detailsRow}>
                  <Text style={styles.serviceName}>{line?.service.name}</Text>
                  <Text style={styles.bagLabel}>
                    ID Kantong: {line?.bags.map((b) => b.bagId).join(', ') || '-'}
                  </Text>
                </View>

                {/* Deadline indicator */}
                <View style={styles.deadlineRow}>
                  <Text style={[styles.deadlineText, isOverdue && styles.overdueText]}>
                    Target Selesai: {new Date(ord.currentPromisedAt).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {isOverdue ? ' (TERLAMBAT)' : ''}
                  </Text>
                </View>

                {/* Package details if already packed */}
                {ord.finalPackages.length > 0 && (
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageText}>
                      Lokasi: {ord.finalPackages[0]?.rackLocation} · Total {ord.finalPackages.length} Paket
                    </Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                  {line?.currentStage !== 'READY' && ord.blockingIssue !== 'OPEN' && (
                    <Button
                      size="sm"
                      label={`Lanjut ke ${
                        line?.workflowSnapshot[line.workflowSnapshot.indexOf(line.currentStage) + 1] || 'Selesai'
                      }`}
                      onPress={() => handleAdvanceStage(ord, line?.lineId || '')}
                    />
                  )}

                  {ord.blockingIssue !== 'OPEN' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      label="Laporkan Kendala"
                      onPress={() => setSelectedOrderForIssue(ord)}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      label="Selesaikan Kendala"
                      onPress={() =>
                        onUpdateOrder({
                          ...ord,
                          blockingIssue: 'RESOLVED',
                        })
                      }
                    />
                  )}
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* Modal QC & Packing */}
      <Modal visible={!!selectedOrderForQC} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>QC Lolos & Masukkan ke Rak</Text>
            <Text style={styles.modalSubtitle}>
              Pesanan {selectedOrderForQC?.orderNumber} ({selectedOrderForQC?.customer.name})
            </Text>

            <Input
              label="Kode / Nomor Rak"
              value={qcRackLocation}
              onChangeText={setQcRackLocation}
              placeholder="Contoh: RAK-A3"
            />

            <View style={{ marginTop: spacing.sm }}>
              <Input
                label="Jumlah Kantong/Paket Jadi"
                value={qcPackageCount}
                onChangeText={setQcPackageCount}
                keyboardType="number-pad"
                placeholder="1"
              />
            </View>

            <View style={styles.modalActions}>
              <Button label="Batal" variant="ghost" onPress={() => setSelectedOrderForQC(null)} />
              <Button label="Simpan & Tandai Siap" onPress={handleConfirmQCAndPack} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Report Issue */}
      <Modal visible={!!selectedOrderForIssue} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Laporkan Kendala Pakaian</Text>
            <Text style={styles.modalSubtitle}>
              Pesanan {selectedOrderForIssue?.orderNumber}
            </Text>

            <Input
              label="Alasan / Jenis Kendala"
              value={issueReason}
              onChangeText={setIssueReason}
              placeholder="Contoh: Baju luntur, noda tinta membandel, kancing hilang"
            />

            <View style={styles.modalActions}>
              <Button label="Batal" variant="ghost" onPress={() => setSelectedOrderForIssue(null)} />
              <Button label="Tandai Blocking Issue" variant="destructive" onPress={handleReportIssue} />
            </View>
          </View>
        </View>
      </Modal>
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
  orderCard: {
    marginBottom: spacing.md,
  },
  overdueCard: {
    borderColor: colors.destructive.DEFAULT,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.cardForeground,
  },
  customerName: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  detailsRow: {
    marginTop: spacing.sm,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  bagLabel: {
    fontSize: 12,
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  deadlineRow: {
    marginTop: 6,
  },
  deadlineText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  overdueText: {
    color: colors.destructive.DEFAULT,
    fontWeight: '700',
  },
  packageInfo: {
    backgroundColor: '#F1F5F9',
    padding: 6,
    borderRadius: radius.sm,
    marginTop: 6,
  },
  packageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: spacing.sm,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: spacing.lg,
  },
});
