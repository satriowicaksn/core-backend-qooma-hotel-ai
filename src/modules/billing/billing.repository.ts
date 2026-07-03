// Repository: Prisma direct (no interface — ADR-0001).

import type { PrismaClient } from '@prisma/client';

import type { BillingExtraRow, BillingInvoiceRow, BillingQuotaRow } from './billing.types.js';

const RECENT_INVOICES_LIMIT = 12;

// Returns the most recent quota row for the hotel, ordered by periodStart DESC.
// Slice-1 treats "latest" as current-period when the seed exists; when no row
// yet (first month or MVP §101 seed missing), returns null — service returns
// `quota: null` upstream (honest empty-state).
export class BillingRepository {
  constructor(private readonly db: PrismaClient) {}

  async findLatestQuota(hotelId: string): Promise<BillingQuotaRow | null> {
    return this.db.billingQuota.findFirst({
      where: { hotelId },
      orderBy: { periodStart: 'desc' },
    });
  }

  async findInvoiceById(id: string): Promise<BillingInvoiceRow | null> {
    return this.db.billingInvoice.findUnique({ where: { id } });
  }

  async listRecentInvoices(hotelId: string): Promise<BillingInvoiceRow[]> {
    return this.db.billingInvoice.findMany({
      where: { hotelId },
      orderBy: { issuedAt: 'desc' },
      take: RECENT_INVOICES_LIMIT,
    });
  }

  // Active = expiresAt is null OR expiresAt > now.
  async listActiveExtras(hotelId: string, now: Date): Promise<BillingExtraRow[]> {
    return this.db.billingExtra.findMany({
      where: {
        hotelId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { purchasedAt: 'desc' },
    });
  }
}
