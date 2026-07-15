import { describe, expect, it, jest } from '@jest/globals';
import { Prisma } from '@prisma/client';

import { NotFoundError, ValidationError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { BillingRepository } from '../billing.repository.js';
import { parseUpgradePackageBody } from '../billing.schema.js';
import { BillingService } from '../billing.service.js';
import type { BillingExtraRow, BillingInvoiceRow, BillingQuotaRow } from '../billing.types.js';
import type { BillingPdfStoragePort } from '../ports/billing-pdf-storage.port.js';
import type {
  UpgradeNotifierPort,
  UpgradeNotifyInput,
  UpgradeNotifyResult,
} from '../ports/upgrade-notifier.port.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const INVOICE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: USER_ID,
    hotelId: HOTEL_A,
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function makeQuota(overrides: Partial<BillingQuotaRow> = {}): BillingQuotaRow {
  return {
    id: 'q-1',
    hotelId: HOTEL_A,
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    outboundQuotaTotal: 4000,
    outboundUsed: 250,
    threshold80EmittedAt: null,
    threshold100EmittedAt: null,
    resetAt: new Date('2026-08-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<BillingInvoiceRow> = {}): BillingInvoiceRow {
  return {
    id: INVOICE_ID,
    hotelId: HOTEL_A,
    invoiceNumber: 'INV-2026-07-001',
    periodStart: new Date('2026-07-01T00:00:00.000Z'),
    periodEnd: new Date('2026-07-31T00:00:00.000Z'),
    amountIdr: new Prisma.Decimal('1500000.00'),
    status: 'issued',
    pdfUrl: 'invoices/1.pdf',
    issuedAt: new Date('2026-07-05T00:00:00.000Z'),
    paidAt: null,
    createdAt: new Date('2026-07-05T00:00:00.000Z'),
    ...overrides,
  };
}

function makeExtra(overrides: Partial<BillingExtraRow> = {}): BillingExtraRow {
  return {
    id: 'e-1',
    hotelId: HOTEL_A,
    type: 'outbound_pack',
    qty: 500,
    amountIdr: new Prisma.Decimal('99000.00'),
    purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
    expiresAt: null,
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<BillingRepository> = {}): BillingRepository {
  return {
    findLatestQuota: () => Promise.resolve(null),
    findInvoiceById: () => Promise.resolve(null),
    listRecentInvoices: () => Promise.resolve([]),
    listActiveExtras: () => Promise.resolve([]),
    findHotelTier: () => Promise.resolve(null),
    findActiveCrmUsersCount: () => Promise.resolve(0),
    ...overrides,
  } as unknown as BillingRepository;
}

function fakeUpgradeNotifier(
  spy?: jest.Mock<(input: UpgradeNotifyInput) => Promise<UpgradeNotifyResult>>,
): UpgradeNotifierPort {
  return {
    notify:
      spy ??
      ((input: UpgradeNotifyInput) =>
        Promise.resolve({ requestId: input.requestId, notifiedAt: new Date() })),
  };
}

function fakePdfStorage(overrides: Partial<BillingPdfStoragePort> = {}): BillingPdfStoragePort {
  return {
    download: () => Promise.resolve(null),
    ...overrides,
  };
}

function svc(
  repo: BillingRepository,
  notifier?: UpgradeNotifierPort,
  storage?: BillingPdfStoragePort,
  logger?: Logger,
): BillingService {
  return new BillingService(repo, notifier ?? fakeUpgradeNotifier(), storage ?? fakePdfStorage(), {
    skipCrossDbChecks: true,
    nodeEnv: 'development',
    ...(logger ? { logger } : {}),
  });
}

describe('zod parsers', () => {
  it('should accept a valid upgrade body', () => {
    expect(parseUpgradePackageBody({ target_tier: 'luxury' })).toEqual({ target_tier: 'luxury' });
  });

  it('should reject the lite downgrade target (Q-T27-#2)', () => {
    expect(() => parseUpgradePackageBody({ target_tier: 'lite' })).toThrow(ValidationError);
  });

  it('should reject an unknown field on upgrade body (strict)', () => {
    expect(() => parseUpgradePackageBody({ target_tier: 'luxury', notes: 'urgent' })).toThrow(
      ValidationError,
    );
  });
});

function svcFlagOff(repo: BillingRepository): BillingService {
  return new BillingService(repo, fakeUpgradeNotifier(), fakePdfStorage(), {
    skipCrossDbChecks: false,
    nodeEnv: 'production',
  });
}

describe('BillingService.overview', () => {
  it('should return tier=null under Opsi C flag=true (Q-T27-#1)', async () => {
    const service = svc(fakeRepo());
    const res = await service.overview(ctx());
    expect(res.data.tier).toBeNull();
  });

  it('should return quota=null when no quota row exists (honest empty state)', async () => {
    const service = svc(fakeRepo({ findLatestQuota: () => Promise.resolve(null) }));
    const res = await service.overview(ctx());
    expect(res.data.quota).toBeNull();
  });

  it('should serialize quota when present', async () => {
    const service = svc(fakeRepo({ findLatestQuota: () => Promise.resolve(makeQuota()) }));
    const res = await service.overview(ctx());
    expect(res.data.quota?.outbound_total).toBe(4000);
    expect(res.data.quota?.outbound_used).toBe(250);
    expect(res.data.quota?.period_start).toBe('2026-07-01');
  });

  it('should serialize invoices ordered as-received from repo', async () => {
    const service = svc(
      fakeRepo({
        listRecentInvoices: () =>
          Promise.resolve([
            makeInvoice({ id: 'i1' }),
            makeInvoice({ id: 'i2', invoiceNumber: 'INV-002' }),
          ]),
      }),
    );
    const res = await service.overview(ctx());
    expect(res.data.invoices.map((i) => i.id)).toEqual(['i1', 'i2']);
    expect(res.data.invoices[0]?.amount_idr).toBe('1500000.00');
  });

  it('should serialize active extras', async () => {
    const service = svc(fakeRepo({ listActiveExtras: () => Promise.resolve([makeExtra()]) }));
    const res = await service.overview(ctx());
    expect(res.data.extras).toHaveLength(1);
    expect(res.data.extras[0]?.amount_idr).toBe('99000.00');
  });

  it('should always return daily_brief_pdf_url_latest=null in slice-1', async () => {
    const service = svc(fakeRepo());
    const res = await service.overview(ctx());
    expect(res.data.daily_brief_pdf_url_latest).toBeNull();
  });

  it('should call listActiveExtras with a Date argument (now)', async () => {
    const listActiveExtras = jest.fn<BillingRepository['listActiveExtras']>().mockResolvedValue([]);
    const service = svc(fakeRepo({ listActiveExtras }));
    await service.overview(ctx());
    expect(listActiveExtras).toHaveBeenCalledWith(HOTEL_A, expect.any(Date));
  });

  it('should return active_crm_users=0 under Opsi C flag=true', async () => {
    const service = svc(fakeRepo());
    const res = await service.overview(ctx());
    expect(res.data.active_crm_users).toBe(0);
  });
});

describe('BillingService.overview — Opsi A (flag=false)', () => {
  it('should resolve tier via repo.findHotelTier when flag=false', async () => {
    const service = svcFlagOff(fakeRepo({ findHotelTier: () => Promise.resolve('professional') }));
    const res = await service.overview(ctx());
    expect(res.data.tier?.name).toBe('professional');
    expect(res.data.tier?.agents_max).toBe(3);
    expect(res.data.tier?.outbound_monthly).toBe(4000);
  });

  it('should return tier=null when hotel not found in shared DB', async () => {
    const service = svcFlagOff(fakeRepo({ findHotelTier: () => Promise.resolve(null) }));
    const res = await service.overview(ctx());
    expect(res.data.tier).toBeNull();
  });

  it('should return active_crm_users from repo when flag=false', async () => {
    const service = svcFlagOff(fakeRepo({ findActiveCrmUsersCount: () => Promise.resolve(2) }));
    const res = await service.overview(ctx());
    expect(res.data.active_crm_users).toBe(2);
  });

  it('should call findActiveCrmUsersCount with hotelId', async () => {
    const findActiveCrmUsersCount = jest
      .fn<BillingRepository['findActiveCrmUsersCount']>()
      .mockResolvedValue(0);
    const service = svcFlagOff(fakeRepo({ findActiveCrmUsersCount }));
    await service.overview(ctx());
    expect(findActiveCrmUsersCount).toHaveBeenCalledWith(HOTEL_A);
  });
});

describe('BillingService.requestUpgrade', () => {
  it('should return 202-shaped envelope with a fresh requestId + status pending_manual_review', async () => {
    const service = svc(fakeRepo());
    const res = await service.requestUpgrade(ctx(), { target_tier: 'luxury' });
    expect(res.data.status).toBe('pending_manual_review');
    expect(typeof res.data.request_id).toBe('string');
    expect(res.data.request_id.length).toBeGreaterThan(0);
    expect(typeof res.data.requested_at).toBe('string');
  });

  it('should call the notifier with ctx.hotelId + ctx.userId + target_tier', async () => {
    const notify = jest
      .fn<(input: UpgradeNotifyInput) => Promise<UpgradeNotifyResult>>()
      .mockResolvedValue({ requestId: 'x', notifiedAt: new Date() });
    const service = svc(fakeRepo(), fakeUpgradeNotifier(notify));
    await service.requestUpgrade(ctx(), { target_tier: 'enterprise' });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        hotelId: HOTEL_A,
        userId: USER_ID,
        targetTier: 'enterprise',
      }),
    );
  });
});

describe('BillingService.downloadInvoicePdf', () => {
  it('should return the invoice number + storage body on happy path', async () => {
    const storage = fakePdfStorage({
      download: () => Promise.resolve(Buffer.from('%PDF-1.4')),
    });
    const service = svc(
      fakeRepo({ findInvoiceById: () => Promise.resolve(makeInvoice()) }),
      undefined,
      storage,
    );
    const result = await service.downloadInvoicePdf(ctx(), INVOICE_ID);
    expect(result.invoiceNumber).toBe('INV-2026-07-001');
    expect(result.body.toString()).toBe('%PDF-1.4');
  });

  it('should 404 Invoice when the row is missing', async () => {
    const service = svc(fakeRepo({ findInvoiceById: () => Promise.resolve(null) }));
    await expect(service.downloadInvoicePdf(ctx(), INVOICE_ID)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should 404 with distinct resource "Invoice" on cross-tenant fetch (leak-safe)', async () => {
    const service = svc(
      fakeRepo({ findInvoiceById: () => Promise.resolve(makeInvoice({ hotelId: HOTEL_B })) }),
    );
    try {
      await service.downloadInvoicePdf(ctx(), INVOICE_ID);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).details.resource).toBe('Invoice');
    }
  });

  it('should 404 with resource "InvoicePdf" when pdfUrl is null', async () => {
    const service = svc(
      fakeRepo({ findInvoiceById: () => Promise.resolve(makeInvoice({ pdfUrl: null })) }),
    );
    try {
      await service.downloadInvoicePdf(ctx(), INVOICE_ID);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).details.resource).toBe('InvoicePdf');
    }
  });

  it('should 404 with resource "InvoicePdfFile" on storage-race (row present, file gone)', async () => {
    const service = svc(
      fakeRepo({ findInvoiceById: () => Promise.resolve(makeInvoice()) }),
      undefined,
      fakePdfStorage({ download: () => Promise.resolve(null) }),
    );
    try {
      await service.downloadInvoicePdf(ctx(), INVOICE_ID);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).details.resource).toBe('InvoicePdfFile');
    }
  });
});

describe('BillingService.downloadDailyBriefPdf (slice-1)', () => {
  it('should always throw NotFoundError with resource "DailyBrief"', () => {
    const service = svc(fakeRepo());
    try {
      service.downloadDailyBriefPdf(ctx());
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      expect((err as NotFoundError).details.resource).toBe('DailyBrief');
      expect((err as NotFoundError).details.id).toBe('latest');
    }
  });
});

describe('Q-C-02 startup WARN', () => {
  it('should WARN once on prod + flag=true', () => {
    const warn = jest.fn();
    const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
    new BillingService(fakeRepo(), fakeUpgradeNotifier(), fakePdfStorage(), {
      skipCrossDbChecks: true,
      nodeEnv: 'production',
      logger,
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'billing',
        event: 'cross_db_check_skip',
        env: 'production',
      }),
    );
  });

  it('should NOT WARN on development + flag=true', () => {
    const warn = jest.fn();
    const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
    new BillingService(fakeRepo(), fakeUpgradeNotifier(), fakePdfStorage(), {
      skipCrossDbChecks: true,
      nodeEnv: 'development',
      logger,
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
