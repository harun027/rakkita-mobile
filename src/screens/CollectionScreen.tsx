/**
 * Collection & Handover Screen
 * Aligned with Section 5.3, Section 6.2, M06, and MB08 of Laundry-PRD-and-System-Analysis-EN.md
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/Badge';
import { Order } from '../contracts/order';
import { validateHandoverPreconditions } from '../core/stateMachine';
import { WhatsAppTemplates } from '../services/whatsapp';
import { ReceiptModal } from '../components/domain/ReceiptModal';
import { colors, spacing, radius } from '../theme/tokens';

interface CollectionScreenProps {
  orders: Order[];
  onUpdateOrder: (updatedOrder: Order) => void;
  currentUserRole?: string;
}

export function CollectionScreen({
  orders,
  onUpdateOrder,
  currentUserRole = 'OUTLET_CASHIER',
}: CollectionScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForHandover, setSelectedOrderForHandover] = useState<Order | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'DIRECT' | 'RECEIPT'>('DIRECT');

  // Supervisor credit release state (M06)
  const [isSupervisorCreditApproved, setIsSupervisorCreditApproved] = useState(false);
  const [creditApprovalReason, setCreditApprovalReason] = useState('');

  // Settlement payment form state (if balance > 0)
  const [payFullBalance, setPayFullBalance] = useState(true);

  // Digital receipt view modal
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Ready orders waiting for collection
  const filteredOrders = orders.filter((ord) => {
    if (ord.lifecycle !== 'ACTIVE') return false;
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    const matchNum = ord.orderNumber.toLowerCase().includes(term);
    const matchName = ord.customer.name.toLowerCase().includes(term);
    const matchPhone = ord.customer.phone && ord.customer.phone.includes(term);
    const matchRack = ord.finalPackages.some((p) => p.rackLocation.toLowerCase().includes(term));
    return matchNum || matchName || matchPhone || matchRack;
  });

  const handleOpenHandoverModal = (order: Order) => {
    const isSpv = currentUserRole === 'OUTLET_SUPERVISOR' || currentUserRole === 'BUSINESS_OWNER';
    const check = validateHandoverPreconditions(order, isSpv);
    
    if (!check.canHandover && !check.requiresSupervisorCreditApproval) {
      Alert.alert('Belum Bisa Diambil', check.reason);
      return;
    }

    setRecipientName(order.customer.name);
    setIsSupervisorCreditApproved(false);
    setCreditApprovalReason('');
    setSelectedOrderForHandover(order);
  };

  const handleConfirmHandover = () => {
    if (!selectedOrderForHandover) return;
    if (!recipientName.trim()) {
      Alert.alert('Error', 'Nama penerima paket wajib diisi.');
      return;
    }

    let updatedOrder: Order = { ...selectedOrderForHandover };

    // If there is an outstanding balance
    if (selectedOrderForHandover.balanceIdr > 0) {
      if (payFullBalance) {
        // Customer pays remaining balance in full
        const remaining = selectedOrderForHandover.balanceIdr;
        updatedOrder = {
          ...updatedOrder,
          confirmedReceiptsIdr: updatedOrder.confirmedReceiptsIdr + remaining,
          netReceiptsIdr: updatedOrder.netReceiptsIdr + remaining,
          balanceIdr: 0,
          settlement: 'SETTLED',
        };
      } else {
        // Credit release: requires supervisor approval (PRD M06)
        if (!isSupervisorCreditApproved) {
          Alert.alert(
            'Persetujuan Kredit Wajib (M06)',
            'Pakaian masih berstatus piutang. Supervisor harus menyetujui pelepasan kredit sebelum barang diserahkan.'
          );
          return;
        }
        if (!creditApprovalReason.trim()) {
          Alert.alert('Error', 'Alasan persetujuan kredit supervisor wajib diisi.');
          return;
        }
      }
    }

    // Final Handover atomic update
    updatedOrder = {
      ...updatedOrder,
      custody: 'HANDED_OVER',
      handedOverAt: new Date().toISOString(),
      handedOverTo: recipientName.trim(),
      handedOverVerificationMethod: verificationMethod === 'DIRECT' ? 'Pelanggan Langsung' : 'Membawa Nota Fisik',
    };

    onUpdateOrder(updatedOrder);
    setSelectedOrderForHandover(null);
    Alert.alert('Sukses', `Paket cucian telah diserahkan kepada ${recipientName}.`);
  };

  const handleSendWhatsAppReady = (order: Order) => {
    if (!order.customer.phone) {
      Alert.alert('Info', 'Nomor WhatsApp pelanggan tidak tercatat.');
      return;
    }

    const { url } = WhatsAppTemplates.orderReady({
      customerPhone: order.customer.phone,
      customerName: order.customer.name,
      orderNumber: order.orderNumber,
      totalIdr: order.netChargesIdr,
      balanceIdr: order.balanceIdr,
      packageCount: order.finalPackages.reduce((acc, p) => acc + p.itemCount, 0),
      rackLocation: order.finalPackages.map((p) => p.rackLocation).join(', ') || 'Meja Kasir',
    });

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Gagal membuka aplikasi WhatsApp di perangkat.');
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Search Input */}
      <View style={styles.searchBox}>
        <Input
          placeholder="🔍 Cari No Order, Nama Pelanggan, atau No Rak..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Orders List for Collection */}
      {filteredOrders.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Tidak ada pesanan yang siap diambil saat ini.</Text>
        </Card>
      ) : (
        filteredOrders.map((ord) => {
          const isReady = ord.lines.every((l) => l.currentStage === 'READY');
          const isHandedOver = ord.custody === 'HANDED_OVER';
          const hasBalance = ord.balanceIdr > 0;

          return (
            <Card
              key={ord.id}
              style={[
                styles.orderCard,
                isHandedOver && styles.handedOverCard,
                isReady && !isHandedOver && styles.readyCard,
              ]}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderNum}>{ord.orderNumber}</Text>
                  <Text style={styles.customerName}>{ord.customer.name}</Text>
                </View>
                <View style={styles.badgeCol}>
                  <StatusBadge type="settlement" value={ord.settlement} />
                  <StatusBadge type="custody" value={ord.custody} />
                </View>
              </View>

              <View style={styles.divider} />

              {/* Package and Rack Info */}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lokasi Rak Penyimpanan:</Text>
                <Text style={styles.rackValue}>
                  {ord.finalPackages.map((p) => p.rackLocation).join(', ') || 'Belum di-packing'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Jumlah Paket Fisik:</Text>
                <Text style={styles.infoVal}>
                  {ord.finalPackages.reduce((acc, p) => acc + p.itemCount, 0)} Bungkus
                </Text>
              </View>

              {/* Financial Status */}
              <View style={styles.financialBox}>
                <View style={styles.finRow}>
                  <Text style={styles.finLabel}>Total Biaya:</Text>
                  <Text style={styles.finVal}>
                    Rp {ord.netChargesIdr.toLocaleString('id-ID')}
                  </Text>
                </View>
                <View style={styles.finRow}>
                  <Text style={styles.finLabel}>Sudah Dibayar (DP):</Text>
                  <Text style={[styles.finVal, { color: colors.primary.DEFAULT }]}>
                    Rp {ord.netReceiptsIdr.toLocaleString('id-ID')}
                  </Text>
                </View>
                <View style={[styles.finRow, styles.balanceRow]}>
                  <Text style={styles.balanceLabel}>Sisa Wajib Lunas:</Text>
                  <Text
                    style={[
                      styles.balanceVal,
                      hasBalance ? styles.unpaidText : styles.settledText,
                    ]}
                  >
                    {hasBalance ? `Rp ${ord.balanceIdr.toLocaleString('id-ID')}` : 'LUNAS'}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={styles.actionRow}>
                {isReady && !isHandedOver && (
                  <Button
                    title="Kirim Notif WA Siap"
                    variant="outline"
                    onPress={() => handleSendWhatsAppReady(ord)}
                    style={styles.waBtn}
                  />
                )}

                <Button
                  title="Lihat Nota"
                  variant="outline"
                  onPress={() => setReceiptOrder(ord)}
                  style={styles.receiptBtn}
                />

                {!isHandedOver ? (
                  <Button
                    title={isReady ? 'Serahkan Laundry' : 'Belum Selesai'}
                    disabled={!isReady}
                    onPress={() => handleOpenHandoverModal(ord)}
                    style={styles.handoverBtn}
                  />
                ) : (
                  <View style={styles.handedOverNotice}>
                    <Text style={styles.handedOverText}>
                      ✓ Telah Diterima oleh: {ord.handedOverTo}
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          );
        })
      )}

      {/* Handover Dialog Modal */}
      <Modal
        visible={selectedOrderForHandover !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrderForHandover(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verifikasi Penyerahan Cucian</Text>
            <Text style={styles.modalSubtitle}>
              Order {selectedOrderForHandover?.orderNumber} ({selectedOrderForHandover?.customer.name})
            </Text>

            {/* Recipient Input */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Nama Penerima Fisik *</Text>
              <Input
                placeholder="Nama orang yang mengambil pakaian"
                value={recipientName}
                onChangeText={setRecipientName}
              />
            </View>

            {/* Verification Method Selection */}
            <View style={styles.modalField}>
              <Text style={styles.fieldLabel}>Metode Verifikasi Identitas:</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioItem,
                    verificationMethod === 'DIRECT' && styles.radioItemActive,
                  ]}
                  onPress={() => setVerificationMethod('DIRECT')}
                >
                  <Text
                    style={[
                      styles.radioText,
                      verificationMethod === 'DIRECT' && styles.radioTextActive,
                    ]}
                  >
                    👤 Pelanggan Langsung
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioItem,
                    verificationMethod === 'RECEIPT' && styles.radioItemActive,
                  ]}
                  onPress={() => setVerificationMethod('RECEIPT')}
                >
                  <Text
                    style={[
                      styles.radioText,
                      verificationMethod === 'RECEIPT' && styles.radioTextActive,
                    ]}
                  >
                    🧾 Membawa Nota / WA
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Settle Balance If Any */}
            {selectedOrderForHandover && selectedOrderForHandover.balanceIdr > 0 && (
              <View style={styles.paymentBox}>
                <Text style={styles.paymentBoxTitle}>
                  Pelunasan Sisa Tagihan (M06 Guard):
                </Text>
                <Text style={styles.paymentBoxAmount}>
                  Sisa Tagihan: Rp {selectedOrderForHandover.balanceIdr.toLocaleString('id-ID')}
                </Text>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setPayFullBalance(!payFullBalance)}
                >
                  <View style={[styles.checkbox, payFullBalance && styles.checkboxActive]}>
                    {payFullBalance && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Terima Pelunasan Tunai / Transfer Penuh Sekarang
                  </Text>
                </TouchableOpacity>

                {!payFullBalance && (
                  <View style={styles.spvCreditCard}>
                    <Text style={styles.spvCreditTitle}>⚠️ Pelepasan Kredit (Ambil Sebelum Lunas)</Text>
                    <Text style={styles.spvCreditDesc}>
                      Hanya Supervisor/Owner yang berhak menyetujui penyerahan tanpa pelunasan.
                    </Text>

                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setIsSupervisorCreditApproved(!isSupervisorCreditApproved)}
                    >
                      <View style={[styles.checkbox, isSupervisorCreditApproved && styles.checkboxActive]}>
                        {isSupervisorCreditApproved && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        Supervisor menyetujui pemberian tempo/kredit
                      </Text>
                    </TouchableOpacity>

                    <View style={{ marginTop: spacing.sm }}>
                      <Input
                        placeholder="Alasan persetujuan tempo / piutang *"
                        value={creditApprovalReason}
                        onChangeText={setCreditApprovalReason}
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Modal Actions */}
            <View style={styles.modalButtons}>
              <Button
                title="Batal"
                variant="outline"
                onPress={() => setSelectedOrderForHandover(null)}
                style={styles.modalBtn}
              />
              <Button
                title="Konfirmasi Penyerahan"
                onPress={handleConfirmHandover}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Digital Receipt Modal */}
      <ReceiptModal
        visible={receiptOrder !== null}
        order={receiptOrder}
        onClose={() => setReceiptOrder(null)}
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
    marginBottom: spacing.md,
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
  readyCard: {
    borderColor: colors.primary.DEFAULT,
  },
  handedOverCard: {
    opacity: 0.7,
    backgroundColor: colors.muted,
  },
  cardHeader: {
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
  badgeCol: {
    gap: 4,
    alignItems: 'flex-end',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  rackValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary.DEFAULT,
  },
  financialBox: {
    backgroundColor: colors.muted,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginVertical: spacing.sm,
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  finLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  finVal: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  balanceRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
    marginTop: 2,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  balanceVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  unpaidText: {
    color: colors.destructive.DEFAULT,
  },
  settledText: {
    color: colors.primary.DEFAULT,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  waBtn: {
    flex: 1,
    height: 38,
  },
  receiptBtn: {
    flex: 1,
    height: 38,
  },
  handoverBtn: {
    flex: 1.4,
    height: 38,
  },
  handedOverNotice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  handedOverText: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: '600',
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
  radioGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  radioItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  radioItemActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  radioText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  radioTextActive: {
    color: colors.primary.dark,
    fontWeight: '700',
  },
  paymentBox: {
    backgroundColor: '#FEF2F2',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  paymentBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  paymentBoxAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#B91C1C',
    marginVertical: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.mutedForeground,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  checkmark: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 12,
    color: colors.cardForeground,
  },
  spvCreditCard: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: '#FFF1F2',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  spvCreditTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#BE123C',
  },
  spvCreditDesc: {
    fontSize: 11,
    color: '#881337',
    marginVertical: 4,
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
