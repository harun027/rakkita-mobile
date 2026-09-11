/**
 * Auth Session Store & Secure Storage Adapter
 * Section 23.4 (Never store plain secrets, handle token refresh, tenant/outlet scoping)
 */

import { UserSession, OutletMembership } from '../contracts/rbac';

const DEFAULT_MOCK_SESSION: UserSession = {
  userId: 'usr-001',
  tenantId: 'ten-001',
  name: 'Budi Santoso',
  email: 'budi@laundryflow.id',
  phone: '081234567890',
  activeOutletId: 'out-01',
  currentRole: 'OUTLET_CASHIER',
  availableOutlets: [
    {
      outletId: 'out-01',
      outletName: 'LaundryFlow Cabang Tebet',
      role: 'OUTLET_CASHIER',
      isPrimary: true,
    },
    {
      outletId: 'out-02',
      outletName: 'LaundryFlow Cabang Kalibata',
      role: 'OUTLET_CASHIER',
    },
    {
      outletId: 'out-03',
      outletName: 'LaundryFlow Pusat (Workshop)',
      role: 'OUTLET_SUPERVISOR',
    },
  ],
};

class AuthStore {
  private currentSession: UserSession | null = DEFAULT_MOCK_SESSION;
  private listeners: Array<(session: UserSession | null) => void> = [];

  getSession(): UserSession | null {
    return this.currentSession;
  }

  getActiveOutlet(): OutletMembership | undefined {
    if (!this.currentSession) return undefined;
    return this.currentSession.availableOutlets.find(
      (o) => o.outletId === this.currentSession?.activeOutletId
    );
  }

  switchOutlet(newOutletId: string): boolean {
    if (!this.currentSession) return false;
    const target = this.currentSession.availableOutlets.find((o) => o.outletId === newOutletId);
    if (!target) return false;

    this.currentSession = {
      ...this.currentSession,
      activeOutletId: target.outletId,
      currentRole: target.role,
    };
    this.notify();
    return true;
  }

  switchRole(newRole: UserSession['currentRole']) {
    if (!this.currentSession) return;
    this.currentSession = {
      ...this.currentSession,
      currentRole: newRole,
    };
    this.notify();
  }

  subscribe(listener: (session: UserSession | null) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.currentSession));
  }
}

export const authStore = new AuthStore();
