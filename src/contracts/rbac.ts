/**
 * Role-Based Access Control (RBAC) Contracts
 * Aligned with Section 10.1 of Laundry-PRD-and-System-Analysis-EN.md
 */

export type UserRole = 
  | 'OWNER' 
  | 'BUSINESS_OWNER'
  | 'OUTLET_SUPERVISOR' 
  | 'OUTLET_CASHIER' 
  | 'PRODUCTION_OPERATOR' 
  | 'OUTLET_OPERATOR'
  | 'SAAS_ADMIN';

export interface OutletMembership {
  outletId: string;
  outletName: string;
  role: UserRole;
  isPrimary?: boolean;
}

export interface UserSession {
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  phone?: string;
  activeOutletId: string;
  availableOutlets: OutletMembership[];
  currentRole: UserRole;
}

/**
 * Checks if a role is permitted to perform specific operations
 */
export const RolePermissions = {
  canCreateOrder(role: UserRole): boolean {
    return role === 'OWNER' || role === 'OUTLET_SUPERVISOR' || role === 'OUTLET_CASHIER';
  },
  canAccessProduction(role: UserRole): boolean {
    return role === 'OWNER' || role === 'OUTLET_SUPERVISOR' || role === 'PRODUCTION_OPERATOR' || role === 'OUTLET_CASHIER';
  },
  canReceiveCash(role: UserRole): boolean {
    return role === 'OWNER' || role === 'OUTLET_SUPERVISOR' || role === 'OUTLET_CASHIER';
  },
  canHandover(role: UserRole): boolean {
    return role === 'OWNER' || role === 'OUTLET_SUPERVISOR' || role === 'OUTLET_CASHIER';
  },
  canApproveCredit(role: UserRole): boolean {
    return role === 'OWNER' || role === 'OUTLET_SUPERVISOR';
  },
  canViewReports(role: UserRole): boolean {
    return role === 'OWNER' || role === 'OUTLET_SUPERVISOR';
  },
  canManageCashDrawer(role: UserRole): boolean {
    return role === 'OWNER' || role === 'OUTLET_SUPERVISOR' || role === 'OUTLET_CASHIER';
  }
};
