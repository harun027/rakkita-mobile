/**
 * WhatsApp Message Helper for LaundryFlow
 * Generates direct wa.me links with clean, deterministic templates
 * Section 14.1 & MB08 (Preview message, never claim automatic delivery without intent)
 */

export interface WhatsAppMessageParams {
  customerPhone: string;
  customerName: string;
  orderNumber: string;
  trackingUrl?: string;
  totalIdr: number;
  balanceIdr: number;
  packageCount?: number;
  rackLocation?: string;
}

export const WhatsAppTemplates = {
  /**
   * Generates order acceptance message
   */
  orderCreated(params: WhatsAppMessageParams): { phone: string; message: string; url: string } {
    const cleanPhone = normalizeIndonesianPhone(params.customerPhone);
    const balanceText =
      params.balanceIdr > 0
        ? `Sisa Tagihan: Rp ${params.balanceIdr.toLocaleString('id-ID')}`
        : 'Status Pembayaran: LUNAS';

    const message = 
`Halo Kak ${params.customerName}, terima kasih telah mencuci di LaundryFlow.

No. Nota: ${params.orderNumber}
Total: Rp ${params.totalIdr.toLocaleString('id-ID')}
${balanceText}

Cek status cucian terkini secara berkala di sini:
${params.trackingUrl || `https://laundryflow.id/track/${params.orderNumber}`}

Terima kasih!`;

    const encoded = encodeURIComponent(message);
    return {
      phone: cleanPhone,
      message,
      url: `https://wa.me/${cleanPhone}?text=${encoded}`,
    };
  },

  /**
   * Generates formatted digital intake receipt text (MB08)
   */
  orderIntakeReceipt(order: any): string {
    const linesSummary = order.lines
      .map((l: any) => `- ${l.service.name}: ${l.service.unit === 'PER_KG' ? `${l.actualGrams}g` : `${l.quantity} pcs`} (Rp ${l.lineGrossIdr.toLocaleString('id-ID')})`)
      .join('\n');

    return `🧾 *NOTA TRANSAKSI LAUNDRYFLOW*
No. Order: ${order.orderNumber}
Pelanggan: ${order.customer.name}
Tanggal: ${new Date(order.createdAt).toLocaleDateString('id-ID')}
Target Selesai: ${new Date(order.currentPromisedAt).toLocaleDateString('id-ID')}

*Rincian Layanan:*
${linesSummary}

Total Tagihan: Rp ${order.netChargesIdr.toLocaleString('id-ID')}
Uang Masuk: Rp ${order.confirmedReceiptsIdr.toLocaleString('id-ID')}
Sisa Tagihan: ${order.balanceIdr > 0 ? `Rp ${order.balanceIdr.toLocaleString('id-ID')}` : 'LUNAS'}

Pantau status proses cucian:
https://laundryflow.id/track/${order.orderNumber}`;
  },

  /**
   * Generates ready-for-collection notification
   */
  orderReady(params: WhatsAppMessageParams): { phone: string; message: string; url: string } {
    const cleanPhone = normalizeIndonesianPhone(params.customerPhone);
    const paymentText =
      params.balanceIdr > 0
        ? `Mohon siapkan pelunasan sebesar: Rp ${params.balanceIdr.toLocaleString('id-ID')}`
        : 'Tagihan telah lunas.';

    const message = 
`Halo Kak ${params.customerName}! Cucian Anda (${params.orderNumber}) sudah SELESAI dan siap diambil.

Jumlah Paket: ${params.packageCount || 1} paket
${paymentText}

Tunjukkan pesan ini atau nomor nota saat pengambilan di kasir. Terima kasih!`;

    const encoded = encodeURIComponent(message);
    return {
      phone: cleanPhone,
      message,
      url: `https://wa.me/${cleanPhone}?text=${encoded}`,
    };
  },
};

/**
 * Normalizes Indonesian phone numbers:
 * 08123456789 -> 628123456789
 * +628123456789 -> 628123456789
 */
export function normalizeIndonesianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}
