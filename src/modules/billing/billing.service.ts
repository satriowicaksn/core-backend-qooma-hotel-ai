// Service: Billing overview aggregation + upgrade request + invoice PDF stream
// + daily-brief 404 stub. Consumes UpgradeNotifierPort + BillingPdfStoragePort.
// RBAC gate lives at the route layer (requireRole([gm_admin])).
//
// Cross-DB tier data (Auth's `tiers` table under H11 PO ruling) is gated by
// SKIP_CROSS_DB_CHECKS — mirror T21 Q-C-02 pattern.

import { randomUUID } from 'node:crypto';

import { NotFoundError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import type { BillingRepository } from './billing.repository.js';
import type { UpgradePackageBody } from './billing.schema.js';
import { serializeExtra, serializeInvoice, serializeQuota } from './billing.serializer.js';
import type {
  BillingInvoiceRow,
  BillingOverviewResponse,
  BillingOverviewWire,
  TierSnapshotWire,
  UpgradeRequestResponse,
} from './billing.types.js';
import type { BillingPdfStoragePort } from './ports/billing-pdf-storage.port.js';
import type { UpgradeNotifierPort } from './ports/upgrade-notifier.port.js';

export interface BillingServiceOptions {
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
  readonly logger?: Logger;
}

export interface InvoicePdfResult {
  readonly invoiceNumber: string;
  readonly body: Buffer;
}

export class BillingService {
  private readonly skipCrossDbChecks: boolean;

  constructor(
    private readonly repo: BillingRepository,
    private readonly upgradeNotifier: UpgradeNotifierPort,
    private readonly pdfStorage: BillingPdfStoragePort,
    opts: BillingServiceOptions,
  ) {
    this.skipCrossDbChecks = opts.skipCrossDbChecks;
    // Q-C-02 observability (mirror departments.service.ts:55-64). Fires once
    // at construction on prod+flag=true so silent tier-null does not ship.
    if (this.skipCrossDbChecks && opts.nodeEnv === 'production' && opts.logger) {
      opts.logger.warn({
        module: 'billing',
        event: 'cross_db_check_skip',
        env: opts.nodeEnv,
        msg: 'tier snapshot skipped (Opsi C)',
      });
    }
  }

  async overview(ctx: TenantContext): Promise<BillingOverviewResponse> {
    const now = new Date();
    // Tier fetched via internal helper — returns null under Opsi C or on
    // failure (fail-open per Q-T27-#6 lean C). Local-DB reads use Promise.all
    // (fail-closed — genuine failure bubbles to route → error handler).
    const tierPromise = this.fetchTierSnapshot(ctx.hotelId);
    const [tier, quotaRow, invoiceRows, extraRows] = await Promise.all([
      tierPromise,
      this.repo.findLatestQuota(ctx.hotelId),
      this.repo.listRecentInvoices(ctx.hotelId),
      this.repo.listActiveExtras(ctx.hotelId, now),
    ]);

    const data: BillingOverviewWire = {
      tier,
      quota: quotaRow ? serializeQuota(quotaRow) : null,
      invoices: invoiceRows.map(serializeInvoice),
      extras: extraRows.map(serializeExtra),
      // Slice-1: W3 daily-brief worker not built; slot honestly null.
      daily_brief_pdf_url_latest: null,
    };
    return { data };
  }

  async requestUpgrade(
    ctx: TenantContext,
    input: UpgradePackageBody,
  ): Promise<UpgradeRequestResponse> {
    const requestId = randomUUID();
    const requestedAt = new Date();
    await this.upgradeNotifier.notify({
      requestId,
      hotelId: ctx.hotelId,
      userId: ctx.userId,
      targetTier: input.target_tier,
      requestedAt,
    });
    return {
      data: {
        request_id: requestId,
        status: 'pending_manual_review',
        requested_at: requestedAt.toISOString(),
      },
    };
  }

  async downloadInvoicePdf(ctx: TenantContext, invoiceId: string): Promise<InvoicePdfResult> {
    const row = await this.loadOwnedInvoice(ctx, invoiceId);
    // Tightening #1: NotFoundError signature is (resource, id?); no invented
    // `code`. Distinct resource strings ('InvoicePdf' vs 'InvoicePdfFile')
    // discriminate the null-url vs storage-race branches on the wire.
    if (!row.pdfUrl) {
      throw new NotFoundError('InvoicePdf', invoiceId);
    }
    const body = await this.pdfStorage.download(row.pdfUrl);
    if (!body) {
      throw new NotFoundError('InvoicePdfFile', invoiceId);
    }
    return { invoiceNumber: row.invoiceNumber, body };
  }

  downloadDailyBriefPdf(_ctx: TenantContext): never {
    // Q-T27-#5 slice-1: W3 worker not built. Honest 404 with 'DailyBrief'
    // resource name distinguishes from invoice paths on the wire.
    throw new NotFoundError('DailyBrief', 'latest');
  }

  private async loadOwnedInvoice(ctx: TenantContext, id: string): Promise<BillingInvoiceRow> {
    const row = await this.repo.findInvoiceById(id);
    if (!row) {
      throw new NotFoundError('Invoice', id);
    }
    // Cross-tenant 404 (leak-safe per spec §7); super_admin bypasses.
    assertHotelOwnership(ctx, row.hotelId, 'Invoice');
    return row;
  }

  private fetchTierSnapshot(_hotelId: string): Promise<TierSnapshotWire | null> {
    if (this.skipCrossDbChecks) {
      // Opsi C dev-DB deviation (PARENT §4): Auth's `tiers` table is not in
      // `hotel_core_dev`. Return null so overview stays functional; FE
      // renders "tier tidak tersedia" empty state. Prod path emits a WARN
      // once at construction (see constructor).
      return Promise.resolve(null);
    }
    // TODO(Opsi A): once shared-DB restored and Hotel model gains a `{ tier:
    // Tier? }` relation, replace with
    //   const hotel = await prisma.hotel.findUnique({ where: { id: hotelId }, include: { tier: true } });
    //   return hotel?.tier ? serializeTier(hotel.tier.name) : null;
    // Slice-1 dead branch keeps flag=false null-safe if the flag flips mid-migration.
    return Promise.resolve(null);
  }
}
