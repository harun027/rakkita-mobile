/**
 * LaundryFlow Pricing Calculator
 * Implements Section 9.1 & 9.3 of Laundry-PRD-and-System-Analysis-EN.md
 * Source of truth: Integer Grams and Integer Rupiah
 */

export interface PricingRule {
  unit: 'PER_KG' | 'PER_PIECE';
  pricePerUnitIdr: number; // e.g. 8000
  minimumGrams?: number;   // e.g. 3000
  incrementGrams?: number; // e.g. 100
}

/**
 * Calculates billable weight in grams based on actual weight, minimums, and rounding increments.
 * Formula: billable_grams = ceil(max(actual_grams, minimum_grams) / increment_grams) * increment_grams
 */
export function calculateBillableGrams(
  actualGrams: number,
  minimumGrams = 0,
  incrementGrams = 100
): number {
  if (actualGrams <= 0) return 0;
  const effectiveGrams = Math.max(actualGrams, minimumGrams);
  const increment = incrementGrams > 0 ? incrementGrams : 100;
  return Math.ceil(effectiveGrams / increment) * increment;
}

/**
 * Calculates line gross price in integer IDR using round_half_up.
 * Formula: round_half_up(billable_grams * price_per_kg_idr / 1000)
 */
export function calculateLineGrossIdr(
  actualGramsOrQty: number,
  rule: PricingRule
): { billableGrams: number; grossIdr: number } {
  if (rule.unit === 'PER_PIECE') {
    const qty = Math.max(1, Math.round(actualGramsOrQty));
    return {
      billableGrams: 0,
      grossIdr: qty * rule.pricePerUnitIdr,
    };
  }

  // Weight-based (PER_KG)
  const billableGrams = calculateBillableGrams(
    actualGramsOrQty,
    rule.minimumGrams ?? 0,
    rule.incrementGrams ?? 100
  );

  // Round half up for integer Rupiah
  const unrounded = (billableGrams * rule.pricePerUnitIdr) / 1000;
  const grossIdr = Math.round(unrounded);

  return { billableGrams, grossIdr };
}

/**
 * Calculates net charges C, net receipts N, and remaining balance.
 * C = initial_charges + debit_adjustments - credit_adjustments
 * N = confirmed_receipts - confirmed_refunds - correcting_reversals
 * balance = C - N
 */
export function calculateOrderBalance(params: {
  initialChargesIdr: number;
  debitAdjustmentsIdr?: number;
  creditAdjustmentsIdr?: number;
  confirmedReceiptsIdr?: number;
  confirmedRefundsIdr?: number;
  correctingReversalsIdr?: number;
}): {
  netChargesIdr: number;
  netReceiptsIdr: number;
  balanceIdr: number;
  settlementStatus: 'UNPAID' | 'PARTIAL' | 'SETTLED' | 'CREDIT_DUE' | 'ZERO_CHARGE';
} {
  const debits = params.debitAdjustmentsIdr ?? 0;
  const credits = params.creditAdjustmentsIdr ?? 0;
  const receipts = params.confirmedReceiptsIdr ?? 0;
  const refunds = params.confirmedRefundsIdr ?? 0;
  const reversals = params.correctingReversalsIdr ?? 0;

  const netChargesIdr = Math.max(0, params.initialChargesIdr + debits - credits);
  const netReceiptsIdr = Math.max(0, receipts - refunds - reversals);
  const balanceIdr = netChargesIdr - netReceiptsIdr;

  let settlementStatus: 'UNPAID' | 'PARTIAL' | 'SETTLED' | 'CREDIT_DUE' | 'ZERO_CHARGE';
  if (netChargesIdr === 0 && netReceiptsIdr === 0) {
    settlementStatus = 'ZERO_CHARGE';
  } else if (balanceIdr === 0) {
    settlementStatus = 'SETTLED';
  } else if (balanceIdr < 0) {
    settlementStatus = 'CREDIT_DUE';
  } else if (netReceiptsIdr > 0) {
    settlementStatus = 'PARTIAL';
  } else {
    settlementStatus = 'UNPAID';
  }

  return {
    netChargesIdr,
    netReceiptsIdr,
    balanceIdr,
    settlementStatus,
  };
}

/**
 * Formats integer Rupiah into localized Indonesian string: "Rp 24.000"
 */
export function formatRupiah(amountIdr: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amountIdr);
}

/**
 * Formats weight in grams into localized Indonesian string: "2,35 kg" or "500 gr"
 */
export function formatWeight(grams: number): string {
  const kg = grams / 1000;
  return `${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
    minimumFractionDigits: kg % 1 === 0 ? 0 : 2,
  }).format(kg)} kg`;
}
