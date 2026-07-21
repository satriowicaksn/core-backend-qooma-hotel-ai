// Domain + wire (snake_case) types for the Billing surface.
// Envelope: camelCase wrapper + snake_case resource body (Q-B-01 / Q-B-07).
//
// Spec §1.10 walks: tier → quota → agents/depts/outbound → invoices → daily brief.
// Slice-1 returns tier snapshot (nullable under Opsi C), current-month quota
// (nullable when seed absent), invoices metadata list, active extras list,
// and `daily_brief_pdf_url_latest: null` (W3 worker deferred).

import type { Prisma } from '@prisma/client';

export type BillingQuotaRow = Prisma.BillingQuotaGetPayload<Record<string, never>>;
export type BillingInvoiceRow = Prisma.BillingInvoiceGetPayload<Record<string, never>>;
export type BillingExtraRow = Prisma.BillingExtraGetPayload<Record<string, never>>;

// Spec §1.10 tier matrix: Lite / Professional / Luxury / Enterprise.
export type TierName = 'lite' | 'professional' | 'luxury' | 'enterprise';

// ADD-25: prepaid outbound top-up package sizes (tier-independent — buying a
// top-up does NOT change the subscription tier).
export type TopupPackage = 'S' | 'M' | 'L';

export type InvoiceStatus = 'issued' | 'paid' | 'overdue' | 'void';

// Wire shapes — snake_case.
// ADD-25: `agents_max` = TOTAL agents incl Receptionist (2/4/6). No per-tier
// outbound allotment — outbound is a prepaid top-up balance.
export interface TierSnapshotWire {
  readonly name: TierName;
  readonly agents_max: number;
  readonly depts_max: number;
  readonly users_max_gm: number;
  readonly users_max_dh: number;
}

// ADD-25: prepaid outbound balance wire — no monthly period/reset. Low-balance
// alerts fire at 20% and 5% remaining.
export interface QuotaWire {
  readonly outbound_balance_total: number;
  readonly outbound_balance_used: number;
  readonly outbound_balance_remaining: number;
  readonly threshold_20_emitted_at: string | null;
  readonly threshold_5_emitted_at: string | null;
}

export interface InvoiceWire {
  readonly id: string;
  readonly invoice_number: string;
  readonly period_start: string;
  readonly period_end: string;
  readonly amount_idr: string;
  readonly status: InvoiceStatus;
  readonly pdf_url: string | null;
  readonly issued_at: string;
  readonly paid_at: string | null;
}

export interface ExtraWire {
  readonly id: string;
  readonly type: string;
  readonly qty: number;
  readonly amount_idr: string;
  readonly purchased_at: string;
  readonly expires_at: string | null;
}

export interface BillingOverviewWire {
  readonly tier: TierSnapshotWire | null;
  readonly active_crm_users: number;
  readonly quota: QuotaWire | null;
  readonly invoices: readonly InvoiceWire[];
  readonly extras: readonly ExtraWire[];
  readonly daily_brief_pdf_url_latest: string | null;
}

export interface BillingOverviewResponse {
  readonly data: BillingOverviewWire;
}

export interface UpgradeRequestWire {
  readonly request_id: string;
  readonly status: 'pending_manual_review';
  readonly requested_at: string;
}

export interface UpgradeRequestResponse {
  readonly data: UpgradeRequestWire;
}
