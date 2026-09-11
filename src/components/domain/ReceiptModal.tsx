import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { Order } from '../../contracts/order';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { colors, radius, spacing } from '../../theme/tokens';
import { WhatsAppTemplates } from '../../services/whatsapp';

interface ReceiptModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
}

export function ReceiptModal({ visible, order, onClose }: ReceiptModalProps) {
  if (!order) return null;

  const handleShareWhatsApp = () => {
    if (!order.customer.phone) {
      Alert.alert('Info', 'Nomor telepon pelanggan belum diisi.');
      return;
    }
    const message = WhatsAppTemplates.orderIntakeReceipt(order);
    const cleanPhone = order.customer.phone.replace(/^0/, '62').replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Share.share({
          message,
          title: `Nota ${order.orderNumber}`,
        });
      }
    });
  };

  const handleSystemShare = () => {
    const text = WhatsAppTemplates.orderIntakeReceipt(order);
    Share.share({
      message: text,
      title: `Nota Digital ${order.orderNumber}`,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.sheetTitle}>Nota Digital Transaksi</Text>
              <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.contentContainer}>
            {/* Store & Customer Banner */}
            <View style={styles.receiptPaper}>
              <View style={styles.storeHeader}>
                <Text style={styles.storeName}>LAUNDRYFLOW / RAKKITA</Text>
                <Text style={styles.storeSub}>Outlet: {order.outletId} · Resik & Rapi</Text>
                <View style={styles.dividerDashed} />
              </View>

              {/* Customer Info */}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Pelanggan:</Text>
                <Text style={styles.metaVal}>{order.customer.name}</Text>
              </View>
              {order.customer.phone ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>No. WhatsApp:</Text>
                  <Text style={styles.metaVal}>{order.customer.phone}</Text>
                </View>
              ) : null}
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Waktu Masuk:</Text>
                <Text style={styles.metaVal}>
                  {new Date(order.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Target Selesai:</Text>
                <Text style={[styles.metaVal, { color: colors.primary.DEFAULT, fontWeight: '700' }]}>
                  {new Date(order.currentPromisedAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <View style={styles.dividerDashed} />

              {/* Items Breakdown */}
              <Text style={styles.sectionHeading}>Rincian Layanan</Text>
              {order.lines.map((line, idx) => (
                <View key={line.lineId || idx} style={styles.lineItem}>
                  <View style={styles.lineHeader}>
                    <Text style={styles.lineServiceName}>{line.service.name}</Text>
                    <Text style={styles.linePrice}>
                      Rp {line.lineGrossIdr.toLocaleString('id-ID')}
                    </Text>
                  </View>
                  <Text style={styles.lineSpecs}>
                    {line.service.unit === 'PER_KG'
                      ? `Timbang: ${line.actualGrams}g → Dihitung: ${line.billableGrams}g (@Rp ${line.unitPriceIdr.toLocaleString('id-ID')}/kg)`
                      : `${line.quantity} pcs @Rp ${line.unitPriceIdr.toLocaleString('id-ID')}`}
                  </Text>
                  {line.bags && line.bags.length > 0 && (
                    <Text style={styles.bagTags}>
                      Kantong: {line.bags.map((b) => b.bagId).join(', ')}
                    </Text>
                  )}
                </View>
              ))}

              <View style={styles.dividerDashed} />

              {/* Payment Summary */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Total Tagihan:</Text>
                <Text style={styles.calcValueBold}>
                  Rp {order.netChargesIdr.toLocaleString('id-ID')}
                </Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Uang Masuk / DP:</Text>
                <Text style={[styles.calcValue, { color: colors.primary.DEFAULT }]}>
                  Rp {order.confirmedReceiptsIdr.toLocaleString('id-ID')}
                </Text>
              </View>
              <View style={[styles.calcRow, styles.balanceRow]}>
                <Text style={styles.balanceLabel}>Sisa Bayar:</Text>
                <Text style={styles.balanceValue}>
                  {order.balanceIdr > 0
                    ? `Rp ${order.balanceIdr.toLocaleString('id-ID')}`
                    : 'LUNAS'}
                </Text>
              </View>

              <View style={styles.statusBadgeRow}>
                <StatusBadge type="settlement" value={order.settlement} />
                <StatusBadge type="custody" value={order.custody} />
              </View>

              {/* Digital QR Code Placeholder */}
              <View style={styles.qrContainer}>
                <View style={styles.qrBox}>
                  <Text style={styles.qrText}>[ QR ORDER ]</Text>
                  <Text style={styles.qrCodeString}>{order.orderNumber}</Text>
                </View>
                <Text style={styles.qrInstruction}>
                  Tunjukkan saat pengambilan pakaian atau scan di meja produksi
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionButtons}>
              <Button
                title="Kirim Nota via WhatsApp"
                onPress={handleShareWhatsApp}
                style={styles.waBtn}
              />
              <Button
                title="Bagikan Teks / Cetak"
                variant="outline"
                onPress={handleSystemShare}
                style={styles.shareBtn}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  orderNumber: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.mutedForeground,
  },
  scrollArea: {
    maxHeight: 520,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  receiptPaper: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  storeHeader: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.primary.DEFAULT,
  },
  storeSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  dividerDashed: {
    borderBottomWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  lineItem: {
    marginBottom: spacing.sm,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineServiceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  linePrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  lineSpecs: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  bagTags: {
    fontSize: 11,
    color: colors.primary.DEFAULT,
    fontWeight: '500',
    marginTop: 2,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  calcLabel: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
  },
  calcValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  balanceRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.destructive.DEFAULT,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  qrBox: {
    width: 140,
    height: 70,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  qrText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.mutedForeground,
  },
  qrCodeString: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    marginTop: 4,
    color: colors.cardForeground,
  },
  qrInstruction: {
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: spacing.md,
  },
  actionButtons: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  waBtn: {
    backgroundColor: '#059669', // WhatsApp green
  },
  shareBtn: {
    marginTop: spacing.xs,
  },
});
