/**
 * Shared API Contracts & DTOs
 * Aligned with Section 13 & 24.1 of Laundry-PRD-and-System-Analysis-EN.md
 */

import { Order, OrderLine, IntakeBag, FinalPackage } from './order';
import { PaymentMethod } from './money';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface CreateOrderRequestDTO {
  idempotencyKey: string;
  tenantId: string;
  outletId: string;
  customer: {
    id?: string;
    name: string;
    phone?: string;
  };
  lines: Array<{
    serviceId: string;
    actualGrams: number;
    quantity: number;
    notes?: string;
    bagLabels?: number;
  }>;
  advancePayment?: {
    amountIdr: number;
    method: PaymentMethod;
    referenceNumber?: string;
  };
}

export interface AdvanceStageRequestDTO {
  orderId: string;
  lineId: string;
  fromStage: string;
  toStage: string;
  operatorNotes?: string;
}

export interface PackAndReadyRequestDTO {
  orderId: string;
  rackLocation: string;
  packageCount: number;
  packedBy: string;
}

export interface HandoverRequestDTO {
  idempotencyKey: string;
  orderId: string;
  handedOverTo: string;
  verificationMethod: 'RECEIPT_CODE' | 'SMS_WA_CODE' | 'DIRECT_CUSTOMER';
  settlementPayment?: {
    amountIdr: number;
    method: PaymentMethod;
  };
  supervisorCreditApproval?: {
    supervisorId: string;
    reason: string;
  };
}
