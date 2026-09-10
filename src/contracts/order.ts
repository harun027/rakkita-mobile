/**
 * LaundryFlow Domain Contracts - Order, WorkItem & Lifecycle
 * Strictly aligned with Laundry-PRD-and-System-Analysis-EN.md Sections 5 & 6
 */

export type OrderLifecycle = 'DRAFT' | 'ACTIVE' | 'CANCELLED';

export type WorkItemStage = 
  | 'QUEUED' 
  | 'WASHING' 
  | 'DRYING' 
  | 'IRONING' 
  | 'FOLDING' 
  | 'QC' 
  | 'READY' 
  | 'CANCELLED';

export type CustodyStatus = 
  | 'IN_CUSTODY' 
  | 'HANDED_OVER' 
  | 'RETURNED_ON_CANCEL';

export type SettlementStatus = 
  | 'UNPAID' 
  | 'PARTIAL' 
  | 'SETTLED' 
  | 'CREDIT_DUE' 
  | 'ZERO_CHARGE';

export type BlockingIssueStatus = 'NONE' | 'OPEN' | 'RESOLVED';

export type ServicePricingUnit = 'PER_KG' | 'PER_PIECE';

export interface ServiceSnapshot {
  id: string;
  name: string;
  unit: ServicePricingUnit;
  pricePerUnitIdr: number; // Integer Rupiah
  minimumGrams?: number;
  incrementGrams?: number;
  slaHours: number;
  defaultWorkflow: WorkItemStage[];
}

export interface IntakeBag {
  bagId: string; // E.g. "BAG-001"
  orderId: string;
  lineId: string;
  labelCount: number;
  notes?: string;
}

export interface OrderLine {
  lineId: string;
  service: ServiceSnapshot;
  actualGrams: number;
  billableGrams: number;
  quantity: number; // Pieces if PER_PIECE, 1 if PER_KG
  unitPriceIdr: number;
  lineGrossIdr: number;
  dueAt: string; // ISO 8601 UTC
  workflowSnapshot: WorkItemStage[];
  currentStage: WorkItemStage;
  bags: IntakeBag[];
}

export interface FinalPackage {
  packageId: string; // E.g. "PKG-001"
  orderId: string;
  rackLocation: string; // E.g. "R-02"
  itemCount: number;
  packedAt: string;
  packedBy: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone?: string; // Normalized Indonesian (+62...)
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // E.g. "ORD-20260910-001"
  tenantId: string;
  outletId: string;
  customer: Customer;
  
  // Independent Status Dimensions (Section 6.1)
  lifecycle: OrderLifecycle;
  custody: CustodyStatus;
  settlement: SettlementStatus;
  blockingIssue: BlockingIssueStatus;
  
  lines: OrderLine[];
  finalPackages: FinalPackage[];
  
  // Money amounts in Integer Rupiah (Section 9.1 & 9.2)
  initialChargesIdr: number;
  debitAdjustmentsIdr: number;
  creditAdjustmentsIdr: number;
  netChargesIdr: number; // C = initial + debits - credits
  
  confirmedReceiptsIdr: number;
  confirmedRefundsIdr: number;
  correctingReversalsIdr: number;
  netReceiptsIdr: number; // N = receipts - refunds - reversals
  
  balanceIdr: number; // balance = C - N
  
  // SLA & Timestamps
  createdAt: string;
  originalPromisedAt: string;
  currentPromisedAt: string;
  firstReadyAt?: string;
  currentReadyAt?: string;
  handedOverAt?: string;
  handedOverTo?: string;
  handedOverVerificationMethod?: string;
}
