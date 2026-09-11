import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Order, BlockingIssueType } from '../../contracts/order';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { colors, radius, spacing } from '../../theme/tokens';

interface IssueReportModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSubmitIssue: (orderId: string, issueType: BlockingIssueType, note: string) => void;
  onResolveIssue?: (orderId: string, resolutionNote: string) => void;
}

const ISSUE_OPTIONS: { type: BlockingIssueType; label: string; desc: string }[] = [
  {
    type: 'STAIN_PERSISTS',
    label: 'Noda Masih Membandel',
    desc: 'Butuh pencucian ulang (re-wash) khusus noda',
  },
  {
    type: 'DAMAGE_DETECTED',
    label: 'Kerusakan / Sobek Terdeteksi',
    desc: 'Kerusakan bawaan pakaian ditemukan sebelum/saat proses',
  },
  {
    type: 'COLOR_BLEED',
    label: 'Resiko / Terjadi Luntur',
    desc: 'Warna pakaian luntur atau perlu penanganan cuci pisah',
  },
  {
    type: 'MISSING_ITEM',
    label: 'Jumlah Tidak Cocok / Tertinggal',
    desc: 'Perbedaan jumlah pakaian fisik dengan catatan awal',
  },
  {
    type: 'OTHER',
    label: 'Kendala Operasional Lain',
    desc: 'Mesin error, mati listrik, atau bahan kimia habis',
  },
];

export function IssueReportModal({
  visible,
  order,
  onClose,
  onSubmitIssue,
  onResolveIssue,
}: IssueReportModalProps) {
  const [selectedType, setSelectedType] = useState<BlockingIssueType>('STAIN_PERSISTS');
  const [issueNote, setIssueNote] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');

  if (!order) return null;

  const hasExistingIssue = order.blockingIssue !== 'NONE';

  const handleReport = () => {
    if (!issueNote.trim()) {
      Alert.alert('Peringatan', 'Catatan kendala wajib ditulis secara jelas.');
      return;
    }
    onSubmitIssue(order.id, selectedType, issueNote.trim());
    setIssueNote('');
    onClose();
  };

  const handleResolve = () => {
    if (!resolutionNote.trim()) {
      Alert.alert('Peringatan', 'Catatan tindakan perbaikan wajib diisi.');
      return;
    }
    if (onResolveIssue) {
      onResolveIssue(order.id, resolutionNote.trim());
      setResolutionNote('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalBox}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {hasExistingIssue ? 'Penanganan Kendala Cucian' : 'Laporkan Kendala & Re-Wash'}
              </Text>
              <Text style={styles.subtitle}>
                Order {order.orderNumber} ({order.customer.name})
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {hasExistingIssue ? (
              <View style={styles.existingIssueBanner}>
                <Text style={styles.existingTitle}>⚠️ Status Saat Ini Tertahan (Blocked)</Text>
                <Text style={styles.existingType}>Jenis Kendala: {order.blockingIssue}</Text>
                <Text style={styles.existingDesc}>
                  Pakaian tidak dapat dilanjutkan ke tahap berikutnya sebelum kendala diselesaikan oleh operator atau supervisor.
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Catatan Tindakan Perbaikan / Solusi:</Text>
                  <Input
                    placeholder="Contoh: Sudah dicuci ulang manual noda hilang, siap lanjut pengeringan"
                    value={resolutionNote}
                    onChangeText={setResolutionNote}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <Button
                  title="Selesaikan Kendala & Buka Blokir"
                  onPress={handleResolve}
                  style={styles.resolveBtn}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.fieldLabel}>Pilih Kategori Kendala (Section 7.3 M10):</Text>
                {ISSUE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[
                      styles.optionCard,
                      selectedType === opt.type && styles.optionCardActive,
                    ]}
                    onPress={() => setSelectedType(opt.type)}
                  >
                    <View style={styles.optionRadio}>
                      {selectedType === opt.type && <View style={styles.optionRadioInner} />}
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>Keterangan Detail Kerusakan/Noda:</Text>
                  <Input
                    placeholder="Tuliskan posisi noda, jenis pakaian, atau detail masalah..."
                    value={issueNote}
                    onChangeText={setIssueNote}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <Button
                  title="Tandai Bermasalah & Tahan Proses"
                  variant="destructive"
                  onPress={handleReport}
                  style={styles.submitBtn}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: 'bold',
  },
  content: {
    padding: spacing.lg,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
  },
  optionCardActive: {
    borderColor: colors.destructive.DEFAULT,
    backgroundColor: '#FEF2F2',
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.mutedForeground,
    marginRight: spacing.md,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.destructive.DEFAULT,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  optionDesc: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  formGroup: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  existingIssueBanner: {
    backgroundColor: '#FFF1F2',
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  existingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#9F1239',
  },
  existingType: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BE123C',
    marginTop: 4,
  },
  existingDesc: {
    fontSize: 12,
    color: '#881337',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  resolveBtn: {
    backgroundColor: colors.primary.DEFAULT,
  },
});
