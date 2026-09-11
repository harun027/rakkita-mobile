import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { authStore } from '../services/authStore';
import { UserRole } from '../contracts/rbac';
import { colors, radius, spacing } from '../theme/tokens';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleManualLogin = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Form Belum Lengkap', 'Masukkan email dan kata sandi Anda.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Mock login for entered credentials
      authStore.loginWithRole('OUTLET_CASHIER', email);
      onLoginSuccess();
    }, 400);
  };

  const handleQuickLoginAs = (role: UserRole, roleName: string, emailPreset: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      authStore.loginWithRole(role, emailPreset);
      onLoginSuccess();
    }, 250);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Branding */}
        <View style={styles.brandHero}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>LF</Text>
          </View>
          <Text style={styles.appTitle}>LaundryFlow / Rakkita</Text>
          <Text style={styles.appSubtitle}>
            Sistem Operasional Kasir, Produksi & Handover Laundry
          </Text>
        </View>

        {/* Login Box */}
        <Card style={styles.loginCard}>
          <Text style={styles.cardHeader}>Masuk Akun Petugas</Text>
          <Text style={styles.cardInstruction}>
            Gunakan akun resmi outlet untuk mencatat transaksi dan produksi.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email / ID Petugas</Text>
            <Input
              placeholder="nama@laundryflow.id"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kata Sandi</Text>
            <Input
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Button
            title={isLoading ? 'Memproses...' : 'Masuk Aplikasi'}
            onPress={handleManualLogin}
            style={styles.loginButton}
          />
        </Card>

        {/* Quick Demo Switcher */}
        <View style={styles.quickAccessSection}>
          <Text style={styles.quickAccessTitle}>Pilihan Akun Demo (UAT & Testing):</Text>
          <Text style={styles.quickAccessDesc}>
            Uji coba cepat peran sistem sesuai Section 2.2 PRD
          </Text>

          <View style={styles.roleGrid}>
            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => handleQuickLoginAs('OUTLET_CASHIER', 'Kasir', 'kasir@laundryflow.id')}
            >
              <Text style={styles.roleBtnTitle}>👤 Kasir (Cashier)</Text>
              <Text style={styles.roleBtnDesc}>Input timbangan, DP, cetak nota</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => handleQuickLoginAs('OUTLET_OPERATOR', 'Operator', 'operator@laundryflow.id')}
            >
              <Text style={styles.roleBtnTitle}>⚙️ Operator Produksi</Text>
              <Text style={styles.roleBtnDesc}>Tahap cuci, QC & rak pakaian</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => handleQuickLoginAs('OUTLET_SUPERVISOR', 'Supervisor', 'spv@laundryflow.id')}
            >
              <Text style={styles.roleBtnTitle}>🛡️ Supervisor Outlet</Text>
              <Text style={styles.roleBtnDesc}>Approval piutang & revisi kasir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleButton}
              onPress={() => handleQuickLoginAs('BUSINESS_OWNER', 'Owner', 'owner@laundryflow.id')}
            >
              <Text style={styles.roleBtnTitle}>👑 Pemilik (Owner)</Text>
              <Text style={styles.roleBtnDesc}>Ringkasan omset & audit piutang</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Compliance Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Laundry Operations SaaS · Versi 1.3 M0 Beta
          </Text>
          <Text style={styles.footerSub}>
            Semua transaksi tercatat dengan timestamp dan audit log individual.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    justifyContent: 'center',
  },
  brandHero: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)',
  },
  logoBadgeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.cardForeground,
  },
  appSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.lg,
  },
  loginCard: {
    padding: spacing.xl,
    marginBottom: spacing.xl,
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  cardInstruction: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cardForeground,
    marginBottom: 6,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  quickAccessSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  quickAccessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  quickAccessDesc: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  roleGrid: {
    gap: spacing.sm,
  },
  roleButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.cardForeground,
  },
  roleBtnDesc: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  footerSub: {
    fontSize: 10,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 2,
  },
});
