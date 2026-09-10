import { calculateBillableGrams, calculateLineGrossIdr, calculateOrderBalance } from './pricing';

/**
 * Fixture verification strictly matching Section 9.3 of PRD
 * Fixture 1: 2,350g, min 3,000g, inc 100g, rate IDR 8,000/kg -> 3,000g billable -> IDR 24,000
 * Discount 2,000 -> Total C = 22,000 -> Cash deposit 10,000 -> Balance 12,000
 */
export function runFixtureTests(): boolean {
  // Test 1: Section 9.3 Fixture 1
  const f1Grams = calculateBillableGrams(2350, 3000, 100);
  console.assert(f1Grams === 3000, `Fixture 1 Billable Grams expected 3000, got ${f1Grams}`);

  const f1Line = calculateLineGrossIdr(2350, {
    unit: 'PER_KG',
    pricePerUnitIdr: 8000,
    minimumGrams: 3000,
    incrementGrams: 100,
  });
  console.assert(f1Line.grossIdr === 24000, `Fixture 1 Gross expected 24000, got ${f1Line.grossIdr}`);

  const f1Balance = calculateOrderBalance({
    initialChargesIdr: 24000,
    creditAdjustmentsIdr: 2000, // Fixed discount
    confirmedReceiptsIdr: 10000, // Deposit
  });
  console.assert(f1Balance.netChargesIdr === 22000, `Net Charges expected 22000, got ${f1Balance.netChargesIdr}`);
  console.assert(f1Balance.balanceIdr === 12000, `Balance expected 12000, got ${f1Balance.balanceIdr}`);
  console.assert(f1Balance.settlementStatus === 'PARTIAL', `Expected status PARTIAL, got ${f1Balance.settlementStatus}`);

  // Test 2: Section 9.3 Fixture 2 (3,210g, min 3,000, inc 100 -> 3,300g billable -> IDR 26,400)
  const f2Line = calculateLineGrossIdr(3210, {
    unit: 'PER_KG',
    pricePerUnitIdr: 8000,
    minimumGrams: 3000,
    incrementGrams: 100,
  });
  console.assert(f2Line.billableGrams === 3300, `Fixture 2 Billable expected 3300, got ${f2Line.billableGrams}`);
  console.assert(f2Line.grossIdr === 26400, `Fixture 2 Gross expected 26400, got ${f2Line.grossIdr}`);

  return true;
}
