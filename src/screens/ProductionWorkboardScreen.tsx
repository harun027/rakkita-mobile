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
import { Order, WorkItemStage, FinalPackage, BlockingIssueType } from '../contracts/order';
import { canAdvanceWorkStage } from '../core/stateMachine';
import { parseScannedCode } from '../core/qrParser';
import { IssueReportModal } from '../components/domain/IssueReportModal';
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

  // Issue reporting modal state
  const [selectedOrderForIssue, setSelectedOrderForIssue] = useState<Order | null>(null);

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
      Alert.alert('Transisi Ditolak', check.reason);
      return;
    }

    // Apply stage update
    const updatedLines = order.lines.map((l) => {
      if (l.lineId === lineId) {
        return {
          ...l,
          currentStage: nextStage,
        };
      }
      return l;
    });

    const updatedOrder: Order = {
      ...order,
      lines: updatedLines,
    };

    onUpdateOrder(updatedOrder);
  };

  const handleConfirmQCAndRack = () => {
    if (!selectedOrderForQC) return;
    if (!qcRackLocation.trim()) {
      Alert.alert('Validasi', 'Lokasi rak penyimpanan pakaian wajib diisi.');
      return;
    }

    const pkgCount = parseInt(qcPackageCount, 10) || 1;
    const pkg: FinalPackage = {
      packageId: `PKG-${Date.now().toString().slice(-4)}`,
      orderId: selectedOrderForQC.id,
      rackLocation: qcRackLocation.trim().toUpperCase(),
      itemCount: pkgCount,
      packedAt: new Date().toISOString(),
      packedBy: 'Operator 1',
    };

    // Advance all lines to READY
    const updatedLines = selectedOrderForQC.lines.map((l) => ({
      ...l,
      currentStage: 'READY' as WorkItemStage,
    }));

    const updatedOrder: Order = {
      ...selectedOrderForQC,
      lines: updatedLines,
      finalPackages: [...selectedOrderForQC.finalPackages, pkg],
      firstReadyAt: selectedOrderForQC.firstReadyAt || new Date().toISOString(),
      currentReadyAt: new Date().toISOString(),
    };

    onUpdateOrder(updatedOrder);
    setSelectedOrderForQC(null);
    Alert.alert('QC Lolos & Masuk Rak', `Paket ditempatkan di ${pkg.rackLocation}. Siap diambil!`);
  };

  const handleSubmitIssue = (orderId: string, issueType: BlockingIssueType, note: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const updatedOrder: Order = {
      ...target,
      blockingIssue: issueType,
    };

    onUpdateOrder(updatedOrder);
    Alert.alert(
      'Kendala Tercatat (M10)',
      `Order ${target.orderNumber} ditahan dengan status: ${issueType}.\nCatatan: ${note}`
    );
  };

  const handleResolveIssue = (orderId: string, resolutionNote: string) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const updatedOrder: Order = {
      ...target,
      blockingIssue: 'NONE',
    };

    onUpdateOrder(updatedOrder);
    Alert.alert(
      'Kendala Diselesaikan',
      `Blokir order ${target.orderNumber} telah dibuka. Pakaian dapat dilanjutkan ke tahap berikutnya.\nSolusi: ${resolutionNote}`
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Search and Barcode Input */}
      <View style={styles.searchBox}>
        <Input
          placeholder="🔍 Scan / Ketik No Order, Label Kantong (BAG-xxx)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Queue Statistics */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Antrean Kerja Aktif: <Text style={styles.bold}>{activeOrders.length} Order</Text>
        </Text>
        <Text style={styles.sortHint}>Urut berdasarkan deadline tercepat ⏱️</Text>
      </View>

      {/* Order Cards */}
      {activeOrders.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Tidak ada antrean cuci aktif saat ini.</Text>
        </Card>
      ) : (
        activeOrders.map((ord) => {
          const isOverdue = new Date(ord.currentPromisedAt).getTime() < Date.now();
          const hasIssue = ord.blockingIssue !== 'NONE';

          return (
            <Card
              key={ord.id}
              style={[
                styles.orderCard,
                isOverdue && styles.overdueCard,
                hasIssue && styles.blockedCard,
              ]}
            >
              {/* Card Header */}
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderNum}>{ord.orderNumber}</Text>
                  <Text style={styles.customerName}>
                    {ord.customer.name} {ord.customer.phone ? `(${ord.customer.phone})` : ''}
                  </Text>
                </View>
                <View style={styles.badgeGroup}>
                  {hasIssue && (
                    <View style={styles.issuePill}>
                      <Text style={styles.issuePillText}>⚠️ TERTUNDA</Text>
                    </View>
                  )}
                  {isOverdue && (
                    <View style={styles.overduePill}>
                      <Text style={styles.overduePillText}>TERLAMBAT</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Work Items / Lines */}
              {ord.lines.map((line) => {
                const stages = line.workflowSnapshot;
                const currentIdx = stages.indexOf(line.currentStage);

                return (
                  <View key={line.lineId} style={styles.lineSection}>
                    <View style={styles.lineHeader}>
                      <Text style={styles.serviceName}>{line.service.name}</Text>
                      <Text style={styles.stageLabel}>Tahap: {line.currentStage}</Text>
                    </View>

                    {/* Bags identification */}
                    <View style={styles.bagsContainer}>
                      {line.bags.map((b) => (
                        <View key={b.bagId} style={styles.bagChip}>
                          <Text style={styles.bagChipText}>🏷️ {b.bagId}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Visual Progress Stepper */}
                    <View style={styles.stepper}>
                      {stages.map((stg, sIdx) => {
                        const isDone = sIdx < currentIdx;
                        const isCurrent = sIdx === currentIdx;
                        return (
                          <View
                            key={stg}
                            style={[
                              styles.stepDot,
                              isDone && styles.stepDotDone,
                              isCurrent && styles.stepDotCurrent,
                            ]}
                          >
                            <Text
                              style={[
                                styles.stepText,
                                (isDone || isCurrent) && styles.stepTextActive,
                              ]}
                            >
                              {stg.slice(0, 3)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Action Controls */}
                    <View style={styles.actionRow}>
                      <Button
                        title={hasIssue ? '⚠️ Pakaian Tertahan' : `Lanjut: ${stages[currentIdx + 1] || 'SELESAI'}`}
                        disabled={hasIssue || line.currentStage === 'READY'}
                        onPress={() => handleAdvanceStage(ord, line.lineId)}
                        style={styles.advanceBtn}
                      />

                      <Button
                        title={hasIssue ? 'Buka Kendala' : 'Lapor Kendala'}
                        variant="outline"
                        onPress={() => setSelectedOrderForIssue(ord)}
                        style={styles.issueBtn}
                      />
                    </View>
                  </View>
                );
              })}

              {/* Deadline & Packages Info */}
              <View style={styles.cardFooter}>
                <Text style={styles.deadlineText}>
                  Target:{' '}
                  {new Date(ord.currentPromisedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>

                {ord.finalPackages.length > 0 && (
                  <Text style={styles.rackText}>
                    📦 Rak: {ord.finalPackages.map((p) => p.rackLocation).join(', ')}
                  </Text>
                )}
              </View>
            </Card>
          );
        })
      )}

      {/* QC & Rack Placement Modal */}
      <Modal
        visible={selectedOrderForQC !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrderForQC(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Quality Control (QC) & Penempatan Rak</Text>
            <Text style={styles.modalSubtitle}>
              Order: {selectedOrderForQC?.orderNumber} ({selectedOrderForQC?.customer.name})
            </Text>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Lokasi Rak Penyimpanan *</Text>
              <Input
                placeholder="Cth: RAK-A1, GANTUNG-03"
                value={qcRackLocation}
                onChangeText={setQcRackLocation}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Jumlah Bungkus / Paket Fisik</Text>
              <Input
                keyboardType="numeric"
                value={qcPackageCount}
                onChangeText={setQcPackageCount}
              />
            </View>

            <View style={styles.modalButtons}>
              <Button
                title="Batal"
                variant="outline"
                onPress={() => setSelectedOrderForQC(null)}
                style={styles.modalBtn}
              />
              <Button
                title="Lolos QC & Simpan"
                onPress={handleConfirmQCAndRack}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Issue Report & Re-Wash Modal (PRD M10) */}
      <IssueReportModal
        visible={selectedOrderForIssue !== null}
        order={selectedOrderForIssue}
        onClose={() => setSelectedOrderForIssue(null)}
        onSubmitIssue={handleSubmitIssue}
        onResolveIssue={handleResolveIssue}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
  searchBox: {
    marginBottom: spacing.sm,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  statusText: {
    fontSize: 13,
    color: colors.cardForeground,
  },
  bold: {
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  sortHint: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  orderCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  overdueCard: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF5F5',
  },
  blockedCard: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNum: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cardForeground,
    fontFamily: 'monospace',
  },
  customerName: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  issuePill: {
    backgroundColor: '#BE123C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  issuePillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  overduePill: {
    backgroundColor: colors.destructive.DEFAULT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  overduePillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  lineSection: {
    marginBottom: spacing.sm,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  stageLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  bagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: spacing.sm,
  },
  bagChip: {
    backgroundColor: colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bagChipText: {
    fontSize: 11,
    color: colors.cardForeground,
  },
  stepper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
    backgroundColor: colors.muted,
    padding: 6,
    borderRadius: radius.sm,
  },
  stepDot: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
  },
  stepDotDone: {
    backgroundColor: colors.primary.light,
  },
  stepDotCurrent: {
    backgroundColor: colors.primary.DEFAULT,
  },
  stepText: {
    fontSize: 9,
    color: colors.mutedForeground,
    fontWeight: '600',
  },
  stepTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  advanceBtn: {
    flex: 2,
    height: 38,
  },
  issueBtn: {
    flex: 1,
    height: 38,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deadlineText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  rackText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  modalField: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  modalBtn: {
    flex: 1,
  },
});
