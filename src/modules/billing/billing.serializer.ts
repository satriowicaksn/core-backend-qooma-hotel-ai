// Serializer: Prisma rows (camelCase) → wire DTOs (snake_case).
// Tightening #2: Decimal → string via .toFixed(2) matches DDL DECIMAL(14,2)
// precision and gives FE a stable "1500000.00" wire shape.

import type {
  BillingExtraRow,
  BillingInvoiceRow,
  BillingQuotaRow,
  ExtraWire,
  InvoiceStatus,
  InvoiceWire,
  QuotaWire,
  TierName,
  TierSnapshotWire,
} from './billing.types.js';

// Spec §1.10 tier matrix. Snapshotted here for the tier-null fallback path
// and for future flag=false wiring — matches the Auth `tiers` table values.
export const TIER_MATRIX: Readonly<Record<TierName, Omit<TierSnapshotWire, 'name'>>> = {
  lite: { agents_max: 1, depts_max: 1, outbound_monthly: 2000, users_max_gm: 1, users_max_dh: 1 },
  professional: {
    agents_max: 3,
    depts_max: 3,
    outbound_monthly: 4000,
    users_max_gm: 1,
    users_max_dh: 3,
  },
  luxury: {
    agents_max: 5,
    depts_max: 5,
    outbound_monthly: 8000,
    users_max_gm: 1,
    users_max_dh: 5,
  },
  enterprise: {
    // Enterprise is custom per spec §1.10; use 0 sentinel = "custom" for now.
    // When Opsi A restores Auth join, real values flow from `tiers` row.
    agents_max: 0,
    depts_max: 0,
    outbound_monthly: 0,
    users_max_gm: 0,
    users_max_dh: 0,
  },
};

export function serializeTier(name: TierName): TierSnapshotWire {
  return { name, ...TIER_MATRIX[name] };
}

export function serializeQuota(row: BillingQuotaRow): QuotaWire {
  return {
    period_start: row.periodStart.toISOString().slice(0, 10),
    outbound_used: row.outboundUsed,
    outbound_total: row.outboundQuotaTotal,
    reset_at: row.resetAt ? row.resetAt.toISOString() : null,
    threshold_80_emitted_at: row.threshold80EmittedAt
      ? row.threshold80EmittedAt.toISOString()
      : null,
    threshold_100_emitted_at: row.threshold100EmittedAt
      ? row.threshold100EmittedAt.toISOString()
      : null,
  };
}

export function serializeInvoice(row: BillingInvoiceRow): InvoiceWire {
  return {
    id: row.id,
    invoice_number: row.invoiceNumber,
    period_start: row.periodStart.toISOString().slice(0, 10),
    period_end: row.periodEnd.toISOString().slice(0, 10),
    amount_idr: row.amountIdr.toFixed(2),
    status: row.status as InvoiceStatus,
    pdf_url: row.pdfUrl,
    issued_at: row.issuedAt.toISOString(),
    paid_at: row.paidAt ? row.paidAt.toISOString() : null,
  };
}

export function serializeExtra(row: BillingExtraRow): ExtraWire {
  return {
    id: row.id,
    type: row.type,
    qty: row.qty,
    amount_idr: row.amountIdr.toFixed(2),
    purchased_at: row.purchasedAt.toISOString(),
    expires_at: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
}
