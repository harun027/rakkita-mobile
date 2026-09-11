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
} from 'react-native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { StatusBadge } from '../components/ui/Badge';
import { Order } from '../contracts/order';
import { validateHandoverPreconditions } from '../core/stateMachine';
import { WhatsAppTemplates } from '../services/whatsapp';
import { colors, spacing, radius } from '../theme/tokens';

interface CollectionScreenProps {
  orders: Order[];
  onUpdateOrder: (updatedOrder: Order) => void;
}

export function CollectionScreen({ orders, onUpdateOrder }: CollectionScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForHandover, setSelectedOrderForHandover] = useState<Order | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'DIRECT' | 'RECEIPT'>('DIRECT');

  // Settlement payment form state (if balance > 0)
  const [payFullBalance, setPayFullBalance] = useState(true);

  // Ready orders waiting for collection
  const filteredOrders = orders.filter((ord) => {
    if (ord.lifecycle !== 'ACTIVE') return false;
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    const matchNum = ord.orderNumber.toLowerCase().includes(term);
    const matchName = ord.customer.name.toLowerCase().includes(term);
    const matchRack = ord.finalPackages.some((p) => p.rackLocation.toLowerCase().includes(term));
    return matchNum || matchName || matchRack;
  });

  const handleOpenHandoverModal = (order: Order) => {
    const check = validateHandoverPreconditions(order, false);
    if (!check.canHandover && !check.requiresSupervisorCreditApproval) {
      Alert.alert('Belum Bisa Diambil', check.reason);
      return;
    }
    setRecipientName(order.customer.name);
    setSelectedOrderForHandover(order);
  };

  const handleConfirmHandover = () => {
    if (!selectedOrderForHandover) return;
    if (!recipientName.trim()) {
      Alert.alert('Error', 'Nama penerima paket wajib diisi.');
      return;
    }

    let updatedOrder: Order = { ...selectedOrderForHandover };

    // If there is outstanding balance and cashier settles it
    if (selectedOrderForHandover.balanceIdr > 0) {
      if (payFullBalance) {
        const remaining = selectedOrderForHandover.balanceIdr;
        updatedOrder = {
          ...updatedOrder,
          confirmedReceiptsIdr: updatedOrder.confirmedReceiptsIdr + remaining,
          netReceiptsIdr: updatedOrder.netReceiptsIdr + remaining,
          balanceIdr: 0,
          settlement: 'SETTLED',
        };
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
      packageCount: order.finalPackages.length || 1,
      rackLocation: order.finalPackages[0]?.rackLocation,
    });

    Linking.openURL(url).catch(() => {
      Alert.alert('Gagal Membuka WhatsApp', 'Pastikan aplikasi WhatsApp terpasang di perangkat.');
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pengambilan & Serah Terima</Text>
        <Text style={styles.subtitle}>
          Verifikasi paket fisik di rak dan pastikan pelunasan sebelum serah terima.
        </Text>
      </View>

      <Input
        label="Cari No. Nota, Pelanggan, atau Kode Rak"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Contoh: RAK-A1 atau Budi"
      />

      <View style={{ marginTop: spacing.md }}>
        {filteredOrders.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Tidak ada pesanan yang sesuai filter.</Text>
          </Card>
        ) : (
          filteredOrders.map((ord) => {
            const isAllReady = ord.lines.every((l) => l.currentStage === 'READY');
            const isHandedOver = ord.custody === 'HANDED_OVER';

            return (
              <Card key={ord.id} style={styles.orderCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.orderNumber}>{ord.orderNumber}</Text>
                    <Text style={styles.customerName}>
                      {ord.customer.name} · {ord.customer.phone || 'Tanpa HP'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <StatusBadge type="custody" value={ord.custody} />
                    <StatusBadge type="settlement" value={ord.settlement} />
                  </View>
                </View>

                {/* Packaging & Location info */}
                <View style={styles.rackRow}>
                  <Text style={styles.rackLabel}>
                    Lokasi Rak: {ord.finalPackages.map((p) => p.rackLocation).join(', ') || 'Belum di-packing'}
                  </Text>
                  <Text style={styles.packageCount}>
                    Total Paket: {ord.finalPackages.length} kantong
                  </Text>
                </View>

                {/* Financial Summary */}
                <View style={styles.financialRow}>
                  <Text style={styles.balanceText}>
                    {ord.balanceIdr > 0 ? (
                      <Text style={{ color: colors.destructive.DEFAULT }}>
                        Belum Lunas: Rp {ord.balanceIdr.toLocaleString('id-ID')}
                      </Text>
                    ) : (
                      <Text style={{ color: colors.primary.DEFAULT }}>LUNAS</Text>
                    )}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {!isHandedOver ? (
                    <Button
                      size="sm"
                      label={ord.balanceIdr > 0 ? 'Pelunasan & Serahkan' : 'Serahkan Cucian'}
                      variant={ord.balanceIdr > 0 ? 'secondary' : 'default'}
                      onPress={() => handleOpenHandoverModal(ord)}
                    />
                  ) : (
                    <Text style={styles.handedOverText}>
                      Diserahkan kpd {ord.handedOverTo} ({new Date(ord.handedOverAt || '').toLocaleDateString('id-ID')})
                    </Text>
                  )}

                  {isAllReady && !isHandedOver && (
                    <Button
                      size="sm"
                      variant="outline"
                      label="Kirim WA Siap Ambil"
                      onPress={() => handleSendWhatsAppReady(ord)}
                    />
                  )}
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* Modal Handover */}
      <Modal visible={!!selectedOrderForHandover} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Konfirmasi Serah Terima</Text>
            <Text style={styles.modalSubtitle}>
              Nota: {selectedOrderForHandover?.orderNumber}
            </Text>

            {/* If balance is outstanding */}
            {selectedOrderForHandover && selectedOrderForHandover.balanceIdr > 0 && (
              <View style={styles.balanceNotice}>
                <Text style={styles.balanceNoticeTitle}>Pelunasan Tagihan Kasir</Text>
                <Text style={styles.balanceNoticeAmount}>
                  Sisa: Rp {selectedOrderForHandover.balanceIdr.toLocaleString('id-ID')}
                </Text>
                <Text style={styles.balanceNoticeSub}>
                  Pelunasan tunai akan langsung tercatat ke laci kasir aktif.
                </Text>
              </View>
            )}

            <Input
              label="Nama Pengambil Paket"
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Contoh: Ibu Siti Sendiri / Suami / Kurir"
            />

            <View style={styles.modalActions}>
              <Button label="Batal" variant="ghost" onPress={() => setSelectedOrderForHandover(null)} />
              <Button label="Serahkan Paket" onPress={handleConfirmHandover} />
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
  rackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  rackLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  packageCount: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  financialRow: {
    marginTop: 6,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
  },
  handedOverText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary.DEFAULT,
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
  balanceNotice: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  balanceNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  balanceNoticeAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.destructive.DEFAULT,
    marginVertical: 2,
  },
  balanceNoticeSub: {
    fontSize: 11,
    color: '#7F1D1D',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: spacing.lg,
  },
});
