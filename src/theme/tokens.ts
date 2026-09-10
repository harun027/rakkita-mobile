/**
 * Design Tokens for LaundryFlow / Rakkita
 * Curated for high usability, contrast ≥ 4.5:1, and clean shadcn styling
 */

export const colors = {
  // Brand Primary (Emerald/Teal - Professional Laundry Cleanliness)
  primary: {
    DEFAULT: '#0F766E', // teal-700
    foreground: '#FFFFFF',
    light: '#CCFBF1',   // teal-100
    dark: '#115E59',    // teal-800
  },
  // Neutrals (Zinc)
  background: '#F8FAFC', // slate-50
  card: '#FFFFFF',
  cardForeground: '#0F172A', // slate-900
  border: '#E2E8F0',        // slate-200
  input: '#E2E8F0',
  muted: '#F1F5F9',         // slate-100
  mutedForeground: '#64748B', // slate-500
  
  // Semantic Status Dimensions (Section 6.1)
  status: {
    // Lifecycle
    draft: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
    active: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    cancelled: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
    
    // Settlement (Money)
    unpaid: { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
    partial: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    settled: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
    creditDue: { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' },
    
    // Custody & Fulfillment
    inCustody: { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    readyForCollection: { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7' },
    handedOver: { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
    
    // Urgency / Overdue
    overdue: { bg: '#7F1D1D', text: '#FFFFFF', border: '#991B1B' },
    urgent: { bg: '#FFF1F2', text: '#E11D48', border: '#FECDD3' },
  },
  
  // Destructive Actions
  destructive: {
    DEFAULT: '#DC2626',
    foreground: '#FFFFFF',
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  touchMin: 44, // Minimum touch target size (44x44 px)
};

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  full: 9999,
};
