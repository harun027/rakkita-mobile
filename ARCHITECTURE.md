# Architectural & Technical Blueprint: LaundryFlow Mobile App (React Native + Expo)

Berdasarkan spesifikasi resmi **Laundry-PRD-and-System-Analysis-EN.md (v1.3)**, khususnya:
- **Section 5:** Operating model & business rules (intake, workflow snapshots, collection, financial source of truth)
- **Section 6:** State machines & 8 system invariants (no single "PAID/DONE" status, atomic operations)
- **Section 9:** Financial records & integer rupiah / integer grams calculation
- **Section 10:** RBAC (Owner, Outlet Supervisor, Outlet Cashier, Production Operator)
- **Section 12:** Relational schema & constraints
- **Section 23:** Mobile Apps PRD (React Native + Expo, Expo Router, SecureStore, internal QR scanning, offline safe-guards, M0 release gates)
- **Section 24:** Shared system, monorepo code structure, and HTTPS `/v1` API contracts

---

## 1. Rencana Arsitektur & Struktur Folder (Senior Architect & Ponytail/Lean)

### Prinsip Utama (Senior Architect & Ponytail/YAGNI):
1. **Single Source of Truth for Calculations:** Semua kalkulasi rupiah & gram dilakukan secara deterministik dengan snapshot. Mobile app memvalidasi input lokal dan menampilkan kalkulasi live yang mencocokkan rumus server, namun otoritas mutlak transaksi ada di server via atomic POST /v1/orders.
2. **Modular Monorepo Structure:** Menggunakan struktur terpisah yang bersih:
   - `src/contracts/` & `src/types/`: Typescript types, enums, & schemas mencerminkan Section 12 & 13.
   - `src/core/`: Domain logic murni (kalkulator berat/harga rupiah, state machine transitions, parser QR).
   - `src/services/`: HTTP API client, idempotency key generator, auth session adapter (Supabase Auth).
   - `src/theme/`: Design tokens (colors, typography scales, elevation, spacing) mengikuti brand LaundryFlow / Rakkita.
   - `src/components/ui/`: Komponen atomic bergaya shadcn/ui untuk React Native (Button, Card, Badge, Input, Keypad, Dialog, EmptyState).
   - `app/` atau `src/screens/`: Screen routing berbasis peran (Cashier, Operator, Supervisor/Owner).

### Struktur Direktori Project Mobile:

```
rakkita/ (project root)
├── assets/                       # Brand icons, logo Rakkita, splash
├── src/
│   ├── contracts/                # Enums, types, & state machine definitions
│   │   ├── order.ts              # OrderLifecycle, WorkItemStatus, CustodyStatus, SettlementStatus
│   │   ├── money.ts              # Integer rupiah, grams, PaymentMethod, CashSession
│   │   ├── rbac.ts               # UserRole, OutletPermissions
│   │   └── api.ts                # DTOs, Idempotency headers, Error shapes
│   ├── core/                     # Pure domain logic & math (zero UI dependencies)
│   │   ├── pricing.ts            # calculateBillableGrams & calculateOrderTotal (Section 9.1 & 9.3)
│   │   ├── stateMachine.ts       # Valid status transitions & validation guards (Section 6.1-6.2)
│   │   └── qrParser.ts           # Internal QR/barcode parser for Bag IDs & Package IDs
│   ├── theme/                    # Design tokens (inspired by shadcn & ui-ux-pro-max)
│   │   ├── colors.ts             # Primary Emerald/Teal, Zinc neutrals, Semantic Status tokens
│   │   ├── typography.ts         # Font sizes, weights, tabular numbers for currency
│   │   └── spacing.ts            # 4px/8px grid scale, touch target ≥44px
│   ├── components/
│   │   ├── ui/                   # Primitive shadcn-style native components
│   │   │   ├── Button.tsx        # Variants: default, secondary, destructive, outline, ghost
│   │   │   ├── Card.tsx          # Clean cards with subtle borders & muted headers
│   │   │   ├── Badge.tsx         # Multi-dimension status badges (Lifecycle, Custody, Settlement)
│   │   │   ├── Input.tsx         # Accessible text inputs with error near field
│   │   │   ├── NumberKeypad.tsx  # Fast weight/money keypad for cashiers
│   │   │   └── EmptyState.tsx    # State ketika tidak ada data atau koneksi
│   │   └── domain/               # Domain-specific UI cards
│   │       ├── OrderCard.tsx     # Menampilkan nomor order, multi-status, tagihan, deadline
│   │       ├── WorkItemCard.tsx  # Queue produksi, bag IDs, tombol next stage
│   │       ├── CashSessionBar.tsx# Status drawer aktif & opening float
│   │       └── OfflineBanner.tsx # Unconfirmed state / disconnected warning (MB09)
│   ├── services/
│   │   ├── apiClient.ts          # Axios/Fetch wrapper dengan auto-retry, JWT, dan Idempotency-Key
│   │   ├── authStore.ts          # Auth state + SecureStore session management (MB01)
│   │   └── syncQueue.ts          # Idempotent offline recovery storage (MB04)
│   └── screens/                  # Feature screens (or Expo Router tabs)
│       ├── auth/                 # Login, Outlet Selection (FR01, FR03)
│       ├── cashier/              # CreateOrder, PaymentModal, HandoverScreen
│       ├── production/           # Workboard queue, QC & Packaging screen, Rack assignment
│       ├── cash/                 # Cash session open/close, expense entry
│       └── overview/             # Owner KPI, receivables, overdue alerts
├── App.tsx                       # Root mobile application
├── app.json                      # Expo application manifest
├── package.json
└── tsconfig.json
```

---

## 2. Skema Data & Alur User Utama (PRD Invariants)

### A. Skema Data Inti (Tipe & Domain Model - Section 5 & 12)
1. **Money & Weight Rule (Section 9.1):**
   - Mata uang: Integer Rupiah (`BIGINT` di database, `number` integer aman di client).
   - Berat: Integer Gram (`actual_grams`, `minimum_grams`, `increment_grams`, `billable_grams`).
   - Formula:
     `billable_grams = ceil(max(actual_grams, min_grams) / inc_grams) * inc_grams`
     `subtotal = round_half_up(billable_grams * price_per_kg_idr / 1000)`
2. **Pemisahan 4 Dimensi Status Status Mutlak (Section 6.1):**
   *Tidak ada satu status "SELESAI" yang mewakili semuanya.*
   - **Order Lifecycle:** `DRAFT` | `ACTIVE` | `CANCELLED`
   - **Work Item Production:** `QUEUED` | `WASHING` | `DRYING` | `IRONING` | `FOLDING` | `QC` | `READY` | `CANCELLED`
   - **Physical Fulfillment / Custody:** `IN_CUSTODY` | `HANDED_OVER` | `RETURNED_ON_CANCEL`
   - **Derived Settlement (Financial):** `UNPAID` | `PARTIAL` | `SETTLED` | `CREDIT_DUE` | `ZERO_CHARGE`

### B. Tiga Alur User Utama:

```
[1. Kasir: Order Intake]
Pelanggan Datang -> Input Berat (Gram) -> Server Quote Recalculation -> 
Pilih DP / Bayar Lunas (Tunai/QRIS) -> Konfirmasi Order (Atomic Commit) ->
Cetak Label Kantong/Bag ID + Kirim WA Manual

[2. Operator: Produksi & QC]
Lihat Workboard (Sort by Deadline) -> Scan Bag ID ->
Update Stage (Washing -> Drying -> Ironing -> QC) ->
Lolos QC? 
  - YA: Masukkan Jumlah Paket Akhir & Kode Rak -> Status READY
  - TIDAK: Supervisor Buat Rework Berisi Alasan -> Kembalikan ke Stage Terkait

[3. Kasir: Pengambilan (Handover) & Pelunasan]
Cari No. Order / Scan QR -> Cek Paket Lengkap & QC Lolos? ->
Cek Sisa Tagihan:
  - Ada Sisa: Bayar Sisa Tagihan Dulu -> Cetak Resi Lunas
  - Sudah Lunas / Izin Kredit Supervisor: 
    -> Catat Nama Pengambil & Metode Verifikasi ->
    -> Release Paket (Atomic HANDED_OVER Commit)
```

---

## 3. Implementasi Kode Fundamental

Mari kita buat implementasi modular, type-safe, dan efisien untuk ketiga fondasi ini:
1. `src/contracts/order.ts` & `src/contracts/money.ts`
2. `src/core/pricing.ts` & unit test fixtures
3. `src/theme/` (Design Tokens Rakkita / LaundryFlow)
4. `src/components/ui/` (Shadcn-style React Native components: Button, Card, Badge, Input, Keypad)
5. Screen interaktif prototipe Mobile Cashier Intake & Production Queue
