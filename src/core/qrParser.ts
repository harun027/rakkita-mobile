/**
 * Internal QR & Barcode Parser for Bags, Packages, and Orders
 * Aligned with MB05 & Section 14.3 of Laundry-PRD-and-System-Analysis-EN.md
 */

export type ScannedCodeType = 'ORDER' | 'BAG' | 'PACKAGE' | 'UNKNOWN';

export interface ParsedCodeResult {
  raw: string;
  type: ScannedCodeType;
  identifier: string;
  isValid: boolean;
  outletHint?: string;
}

/**
 * Parses scanned QR/barcodes strictly according to the format used in LaundryFlow:
 * - Order Number: ORD-YYYYMMDD-XXX (e.g. ORD-20260910-001)
 * - Bag ID: BAG-XXX or BAG-ORDID-XX (e.g. BAG-001, BAG-402)
 * - Package ID: PKG-XXX (e.g. PKG-082)
 * - Or deep link format: https://.../track/ORD-...
 */
export function parseScannedCode(rawInput: string): ParsedCodeResult {
  const trimmed = rawInput.trim();

  // Extract from URL if scanned from customer tracking link
  let code = trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const urlParts = trimmed.split('/');
    code = urlParts[urlParts.length - 1] || trimmed;
  }

  // Check Order format
  const orderRegex = /^ORD-\d{8}-\d{3,6}$/i;
  if (orderRegex.test(code)) {
    return {
      raw: rawInput,
      type: 'ORDER',
      identifier: code.toUpperCase(),
      isValid: true,
    };
  }

  // Check Bag format
  const bagRegex = /^BAG-[A-Z0-9-]+$/i;
  if (bagRegex.test(code)) {
    return {
      raw: rawInput,
      type: 'BAG',
      identifier: code.toUpperCase(),
      isValid: true,
    };
  }

  // Check Package format
  const pkgRegex = /^PKG-[A-Z0-9-]+$/i;
  if (pkgRegex.test(code)) {
    return {
      raw: rawInput,
      type: 'PACKAGE',
      identifier: code.toUpperCase(),
      isValid: true,
    };
  }

  // Generic fallback if user typed an order prefix
  if (code.toUpperCase().startsWith('ORD-')) {
    return {
      raw: rawInput,
      type: 'ORDER',
      identifier: code.toUpperCase(),
      isValid: true,
    };
  }

  return {
    raw: rawInput,
    type: 'UNKNOWN',
    identifier: trimmed,
    isValid: false,
  };
}
