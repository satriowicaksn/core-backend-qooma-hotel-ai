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
// ADD-25: `agents_max` = TOTAL agents incl Receptionist (Lite 2 / Pro 4 /
// Luxury 6). No per-tier outbound allotment — outbound is a prepaid top-up
// balance metered per hotel.
export const TIER_MATRIX: Readonly<Record<TierName, Omit<TierSnapshotWire, 'name'>>> = {
  lite: { agents_max: 2, depts_max: 1, users_max_gm: 1, users_max_dh: 1 },
  professional: {
    agents_max: 4,
    depts_max: 3,
    users_max_gm: 1,
    users_max_dh: 3,
  },
  luxury: {
    agents_max: 6,
    depts_max: 5,
    users_max_gm: 1,
    users_max_dh: 5,
  },
  enterprise: {
    // Enterprise is custom per spec §1.10; use 0 sentinel = "custom" for now.
    // When Opsi A restores Auth join, real values flow from `tiers` row.
    agents_max: 0,
    depts_max: 0,
    users_max_gm: 0,
    users_max_dh: 0,
  },
};

export function serializeTier(name: TierName): TierSnapshotWire {
  return { name, ...TIER_MATRIX[name] };
}

export function serializeQuota(row: BillingQuotaRow): QuotaWire {
  return {
    outbound_balance_total: row.outboundBalanceTotal,
    outbound_balance_used: row.outboundBalanceUsed,
    outbound_balance_remaining: row.outboundBalanceTotal - row.outboundBalanceUsed,
    threshold_20_emitted_at: row.threshold20EmittedAt
      ? row.threshold20EmittedAt.toISOString()
      : null,
    threshold_5_emitted_at: row.threshold5EmittedAt ? row.threshold5EmittedAt.toISOString() : null,
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
