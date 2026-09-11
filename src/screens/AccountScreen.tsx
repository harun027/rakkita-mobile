import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { authStore } from '../services/authStore';
import { UserRole } from '../contracts/rbac';
import { colors, radius, spacing } from '../theme/tokens';

interface AccountScreenProps {
  onLogout: () => void;
  isOfflineSimulated: boolean;
  onToggleOffline: (val: boolean) => void;
  onOpenOutletModal: () => void;
}

export function AccountScreen({
  onLogout,
  isOfflineSimulated,
  onToggleOffline,
  onOpenOutletModal,
}: AccountScreenProps) {
  const session = authStore.getSession();
  const activeOutlet = authStore.getActiveOutlet();

  const handleSwitchRole = (role: UserRole) => {
    authStore.switchRole(role);
    Alert.alert('Peran Diperbarui', `Peran aktif sekarang: ${role}`);
  };

  const handleConfirmLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar? Sesi token dan cache lokal akan dibersihkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar Akun',
          style: 'destructive',
          onPress: () => {
            authStore.logout();
            onLogout();
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Profile Banner */}
      <Card style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {session?.name ? session.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.userName}>{session?.name || 'Petugas Outlet'}</Text>
            <Text style={styles.userEmail}>{session?.email || 'petugas@laundryflow.id'}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{session?.currentRole || 'KASIR'}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Outlet Management (PRD MB02) */}
      <Text style={styles.sectionHeader}>Outlet & Penugasan</Text>
      <Card style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>Outlet Aktif</Text>
            <Text style={styles.settingDesc}>
              {activeOutlet?.outletName || 'LaundryFlow Cabang Tebet'}
            </Text>
            <Text style={styles.settingCode}>ID: {session?.activeOutletId || 'out-01'}</Text>
          </View>
          <Button
            title="Ganti"
            variant="outline"
            onPress={onOpenOutletModal}
            style={styles.changeOutletBtn}
          />
        </View>
      </Card>

      {/* Role Switching for Testing / Supervisor Override */}
      <Text style={styles.sectionHeader}>Simulasi Hak Akses (RBAC)</Text>
      <Card style={styles.settingCard}>
        <Text style={styles.cardInfo}>
          Pilih peran untuk menguji tampilan antarmuka kasir, produksi, atau audit:
        </Text>
        <View style={styles.roleButtonGroup}>
          <TouchableOpacity
            style={[
              styles.roleChip,
              session?.currentRole === 'OUTLET_CASHIER' && styles.roleChipActive,
            ]}
            onPress={() => handleSwitchRole('OUTLET_CASHIER')}
          >
            <Text
              style={[
                styles.roleChipText,
                session?.currentRole === 'OUTLET_CASHIER' && styles.roleChipTextActive,
              ]}
            >
              Kasir
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleChip,
              session?.currentRole === 'OUTLET_OPERATOR' && styles.roleChipActive,
            ]}
            onPress={() => handleSwitchRole('OUTLET_OPERATOR')}
          >
            <Text
              style={[
                styles.roleChipText,
                session?.currentRole === 'OUTLET_OPERATOR' && styles.roleChipTextActive,
              ]}
            >
              Operator
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleChip,
              session?.currentRole === 'OUTLET_SUPERVISOR' && styles.roleChipActive,
            ]}
            onPress={() => handleSwitchRole('OUTLET_SUPERVISOR')}
          >
            <Text
              style={[
                styles.roleChipText,
                session?.currentRole === 'OUTLET_SUPERVISOR' && styles.roleChipTextActive,
              ]}
            >
              Supervisor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleChip,
              session?.currentRole === 'BUSINESS_OWNER' && styles.roleChipActive,
            ]}
            onPress={() => handleSwitchRole('BUSINESS_OWNER')}
          >
            <Text
              style={[
                styles.roleChipText,
                session?.currentRole === 'BUSINESS_OWNER' && styles.roleChipTextActive,
              ]}
            >
              Owner
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Network & Device Invariants (PRD MB09, Section 23.4) */}
      <Text style={styles.sectionHeader}>Koneksi & Keandalan (MB09)</Text>
      <Card style={styles.settingCard}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: spacing.md }}>
            <Text style={styles.settingTitle}>Simulasi Jaringan Terputus (Offline)</Text>
            <Text style={styles.settingDesc}>
              Menguji proteksi sistem agar tidak mencetak nota transaksi palsu saat koneksi drop.
            </Text>
          </View>
          <Switch
            value={isOfflineSimulated}
            onValueChange={onToggleOffline}
            trackColor={{ false: colors.border, true: colors.destructive.DEFAULT }}
          />
        </View>
      </Card>

      {/* App & Compliance Info */}
      <Text style={styles.sectionHeader}>Informasi Sistem</Text>
      <Card style={styles.settingCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versi Aplikasi:</Text>
          <Text style={styles.infoVal}>v1.3-beta (Build 2026.09)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Penyimpanan Kunci:</Text>
          <Text style={styles.infoVal}>Expo SecureStore (Encrypted)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Backend URL:</Text>
          <Text style={styles.infoVal}>https://api.laundryflow.id/v1</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Idempotency Cache:</Text>
          <Text style={styles.infoVal}>Aktif (MB04)</Text>
        </View>
      </Card>

      {/* Logout Action */}
      <View style={styles.logoutWrapper}>
        <Button
          title="Keluar dari Aplikasi (Logout)"
          variant="destructive"
          onPress={handleConfirmLogout}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  profileCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  userEmail: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary.light,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 6,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary.dark,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  settingCard: {
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  settingDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  settingCode: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.primary.DEFAULT,
    marginTop: 4,
  },
  changeOutletBtn: {
    paddingHorizontal: spacing.md,
    height: 38,
  },
  cardInfo: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginBottom: spacing.md,
  },
  roleButtonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  roleChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  },
  roleChipActive: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  roleChipTextActive: {
    color: colors.primary.dark,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  logoutWrapper: {
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
});
