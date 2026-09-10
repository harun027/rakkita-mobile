/**
 * LaundryFlow Domain Contracts - Money, Cash Sessions & Transactions
 * Strictly aligned with Laundry-PRD-and-System-Analysis-EN.md Section 9
 */

export type PaymentMethod = 'CASH' | 'MANUAL_TRANSFER' | 'QRIS' | 'COMPENSATION_CREDIT';

export type PaymentAttemptStatus = 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED';

export interface PaymentReceipt {
  id: string;
  orderId: string;
  outletId: string;
  amountIdr: number; // Integer Rupiah
  method: PaymentMethod;
  status: PaymentAttemptStatus;
  cashierId: string;
  createdAt: string;
  referenceNumber?: string;
  notes?: string;
}

export interface CashSession {
  id: string;
  outletId: string;
  cashierId: string;
  openedAt: string;
  closedAt?: string;
  
  openingFloatIdr: number;
  cashReceiptsIdr: number;
  authorizedCashInIdr: number;
  cashRefundsIdr: number;
  cashExpensesIdr: number;
  authorizedCashOutIdr: number;
  
  expectedClosingCashIdr: number;
  actualClosingCashIdr?: number;
  discrepancyIdr?: number; // actual - expected
  supervisorReviewed: boolean;
  notes?: string;
}

export interface CashExpense {
  id: string;
  outletId: string;
  cashSessionId: string;
  category: 'SUPPLIES' | 'UTILITIES' | 'MAINTENANCE' | 'OTHER';
  amountIdr: number;
  note: string;
  recordedBy: string;
  createdAt: string;
}
