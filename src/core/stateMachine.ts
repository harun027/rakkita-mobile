/**
 * LaundryFlow State Machine & Validation Guards
 * Aligned with Section 6 of Laundry-PRD-and-System-Analysis-EN.md
 */

import {
  OrderLifecycle,
  WorkItemStage,
  CustodyStatus,
  SettlementStatus,
  BlockingIssueStatus,
  Order,
} from '../contracts/order';

/**
 * Derives SettlementStatus deterministically from charges and net receipts (Section 6.1 & 9.2)
 * Formula: balance = netChargesIdr - netReceiptsIdr
 */
export function deriveSettlementStatus(netChargesIdr: number, netReceiptsIdr: number): SettlementStatus {
  if (netChargesIdr === 0) {
    return 'ZERO_CHARGE';
  }
  const balance = netChargesIdr - netReceiptsIdr;
  if (netReceiptsIdr <= 0) {
    return 'UNPAID';
  }
  if (balance <= 0) {
    return 'SETTLED';
  }
  return 'PARTIAL';
}

/**
 * Validates if work item stage transition is allowed.
 * Workflow snapshot determines the allowed progression.
 */
export function canAdvanceWorkStage(
  currentStage: WorkItemStage,
  nextStage: WorkItemStage,
  workflowSnapshot: WorkItemStage[],
  blockingIssue: BlockingIssueStatus = 'NONE'
): { allowed: boolean; reason?: string } {
  if (blockingIssue === 'OPEN') {
    return { allowed: false, reason: 'Ada kendala operasional (Blocking Issue). Selesaikan terlebih dahulu.' };
  }

  if (currentStage === 'CANCELLED' || currentStage === 'READY') {
    return { allowed: false, reason: `Tahap ${currentStage} tidak dapat dimajukan lagi.` };
  }

  const currentIndex = workflowSnapshot.indexOf(currentStage);
  const nextIndex = workflowSnapshot.indexOf(nextStage);

  if (currentIndex === -1 || nextIndex === -1) {
    return { allowed: false, reason: 'Tahapan tidak ditemukan pada alur kerja pesanan ini.' };
  }

  // Allow advancing to the immediate next stage, or explicit rework loop
  if (nextIndex === currentIndex + 1) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Urutan tahap tidak valid. Dari ${currentStage} harus ke ${workflowSnapshot[currentIndex + 1] || 'SELESAI'}.`,
  };
}

export interface HandoverValidationResult {
  canHandover: boolean;
  requiresSupervisorCreditApproval: boolean;
  reason?: string;
}

/**
 * Validates Handover command preconditions (Section 6.2)
 * Invariants:
 * 1. Order must be ACTIVE lifecycle
 * 2. Custody must currently be IN_CUSTODY
 * 3. All items must be READY and packaged
 * 4. Balance must be <= 0 OR have explicit supervisor credit approval
 */
export function validateHandoverPreconditions(
  order: Order,
  hasSupervisorCreditApproval: boolean = false
): HandoverValidationResult {
  if (order.lifecycle !== 'ACTIVE') {
    return {
      canHandover: false,
      requiresSupervisorCreditApproval: false,
      reason: `Pesanan berstatus ${order.lifecycle}, tidak dapat diserahterimakan.`,
    };
  }

  if (order.custody !== 'IN_CUSTODY') {
    return {
      canHandover: false,
      requiresSupervisorCreditApproval: false,
      reason: `Status fisik cucian sudah ${order.custody}. Tidak dapat diserahkan dua kali.`,
    };
  }

  if (order.blockingIssue === 'OPEN') {
    return {
      canHandover: false,
      requiresSupervisorCreditApproval: false,
      reason: 'Terdapat kendala (Blocking Issue) yang belum terselesaikan.',
    };
  }

  // Check all lines are READY
  const allLinesReady = order.lines.every((line) => line.currentStage === 'READY');
  if (!allLinesReady) {
    return {
      canHandover: false,
      requiresSupervisorCreditApproval: false,
      reason: 'Proses produksi belum selesai (semua item harus berstatus READY).',
    };
  }

  // Check balance
  if (order.balanceIdr > 0) {
    if (!hasSupervisorCreditApproval) {
      return {
        canHandover: false,
        requiresSupervisorCreditApproval: true,
        reason: `Masih ada sisa tagihan Rp ${order.balanceIdr.toLocaleString('id-ID')}. Perlu pelunasan atau izin kredit Supervisor.`,
      };
    }
  }

  return {
    canHandover: true,
    requiresSupervisorCreditApproval: false,
  };
}
