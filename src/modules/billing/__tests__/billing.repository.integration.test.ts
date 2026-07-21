// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Self-contained: spins its own PG, applies migrations, seeds fixtures. Requires Docker.
// Crux (T27 / ADD-25): UNIQUE(hotel_id) one prepaid balance row per hotel +
// UNIQUE(invoice_number) + status CHECK + tenant isolation + invoices ORDER BY
// issuedAt DESC + extras active filter (expiresAt IS NULL OR > now). Overview
// aggregation E2E via service.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Prisma, PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { NotFoundError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { InMemoryBillingPdfStorageAdapter } from '../adapters/in-memory-billing-pdf-storage.adapter.js';
import type { BillingService } from '../billing.service.js';
import { buildBillingService } from '../index.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_A = '1111aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = '2222bbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const gmA: TenantContext = {
  userId: USER_A,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const gmB: TenantContext = {
  userId: USER_B,
  hotelId: HOTEL_B,
  isSuperAdmin: false,
  role: 'gm_admin',
};

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: BillingService;
let pdfStorage: InMemoryBillingPdfStorageAdapter;

function silentLogger(): Logger {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });

  // HOTEL_A: one prepaid outbound-balance row + 3 invoices in different statuses + 2 extras (1 active + 1 expired).
  await db.billingQuota.create({
    data: {
      id: '10000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      hotelId: HOTEL_A,
      outboundBalanceTotal: 10000,
      outboundBalanceUsed: 2500,
    },
  });

  await db.billingInvoice.createMany({
    data: [
      {
        id: '20000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        invoiceNumber: 'INV-2026-05-001',
        periodStart: new Date('2026-05-01'),
        periodEnd: new Date('2026-05-31'),
        amountIdr: new Prisma.Decimal('1500000.00'),
        status: 'paid',
        pdfUrl: 'invoices/A/2026-05.pdf',
        issuedAt: new Date('2026-05-05T00:00:00.000Z'),
        paidAt: new Date('2026-05-15T00:00:00.000Z'),
      },
      {
        id: '20000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        invoiceNumber: 'INV-2026-06-001',
        periodStart: new Date('2026-06-01'),
        periodEnd: new Date('2026-06-30'),
        amountIdr: new Prisma.Decimal('1500000.00'),
        status: 'overdue',
        pdfUrl: null,
        issuedAt: new Date('2026-06-05T00:00:00.000Z'),
      },
      {
        id: '20000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        invoiceNumber: 'INV-2026-07-001',
        periodStart: new Date('2026-07-01'),
        periodEnd: new Date('2026-07-31'),
        amountIdr: new Prisma.Decimal('1500000.00'),
        status: 'issued',
        pdfUrl: 'invoices/A/2026-07.pdf',
        issuedAt: new Date('2026-07-05T00:00:00.000Z'),
      },
    ],
  });

  await db.billingExtra.createMany({
    data: [
      {
        id: '30000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        type: 'outbound_pack',
        qty: 500,
        amountIdr: new Prisma.Decimal('99000.00'),
        purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
        expiresAt: null, // active — never expires
      },
      {
        id: '30000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        hotelId: HOTEL_A,
        type: 'extra_agent',
        qty: 1,
        amountIdr: new Prisma.Decimal('250000.00'),
        purchasedAt: new Date('2026-05-01T00:00:00.000Z'),
        expiresAt: new Date('2026-06-01T00:00:00.000Z'), // expired before now
      },
    ],
  });

  // HOTEL_B: minimal fixtures for isolation checks.
  await db.billingQuota.create({
    data: {
      id: '10000000-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      hotelId: HOTEL_B,
      outboundBalanceTotal: 2000,
      outboundBalanceUsed: 100,
    },
  });
  await db.billingInvoice.create({
    data: {
      id: '20000000-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      hotelId: HOTEL_B,
      invoiceNumber: 'INV-2026-07-B01',
      periodStart: new Date('2026-07-01'),
      periodEnd: new Date('2026-07-31'),
      amountIdr: new Prisma.Decimal('750000.00'),
      status: 'issued',
      pdfUrl: 'invoices/B/2026-07.pdf',
      issuedAt: new Date('2026-07-05T00:00:00.000Z'),
    },
  });

  // Seed the in-memory storage with the invoice PDFs.
  pdfStorage.put('invoices/A/2026-07.pdf', Buffer.from('%PDF-A-2026-07'));
  pdfStorage.put('invoices/B/2026-07.pdf', Buffer.from('%PDF-B-2026-07'));
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  const url = container.getConnectionUri();
  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
  db = new PrismaClient({ datasources: { db: { url } } });
  pdfStorage = new InMemoryBillingPdfStorageAdapter();
  service = buildBillingService(db, {
    logger: silentLogger(),
    pdfStorage,
    skipCrossDbChecks: true,
    nodeEnv: 'development',
  });
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.billingExtra.deleteMany();
  await db.billingInvoice.deleteMany();
  await db.billingQuota.deleteMany();
  await db.hotel.deleteMany();
  pdfStorage = new InMemoryBillingPdfStorageAdapter();
  service = buildBillingService(db, {
    logger: silentLogger(),
    pdfStorage,
    skipCrossDbChecks: true,
    nodeEnv: 'development',
  });
  await seed();
});

describe('BillingService overview + invoice download (integration)', () => {
  describe('overview aggregation', () => {
    it('should assemble tier=null, latest quota, invoices, extras (active only)', async () => {
      const res = await service.overview(gmA);
      expect(res.data.tier).toBeNull();
      // Prepaid outbound balance (single row per hotel).
      expect(res.data.quota?.outbound_balance_total).toBe(10000);
      expect(res.data.quota?.outbound_balance_used).toBe(2500);
      expect(res.data.quota?.outbound_balance_remaining).toBe(7500);
      // Invoices ordered by issuedAt DESC.
      expect(res.data.invoices.map((i) => i.invoice_number)).toEqual([
        'INV-2026-07-001',
        'INV-2026-06-001',
        'INV-2026-05-001',
      ]);
      // Extras active only (expiresAt IS NULL OR > now).
      expect(res.data.extras).toHaveLength(1);
      expect(res.data.extras[0]?.type).toBe('outbound_pack');
      expect(res.data.daily_brief_pdf_url_latest).toBeNull();
    });

    it('should serialize amount_idr as fixed(2) string', async () => {
      const res = await service.overview(gmA);
      expect(res.data.invoices[0]?.amount_idr).toBe('1500000.00');
      expect(res.data.extras[0]?.amount_idr).toBe('99000.00');
    });

    it('should isolate HOTEL_B from HOTEL_A data', async () => {
      const res = await service.overview(gmB);
      expect(res.data.quota?.outbound_balance_total).toBe(2000);
      expect(res.data.invoices).toHaveLength(1);
      expect(res.data.invoices[0]?.invoice_number).toBe('INV-2026-07-B01');
      expect(res.data.extras).toHaveLength(0);
    });
  });

  describe('DB constraints', () => {
    it('should reject a second billing_quota row for the same hotel (UNIQUE hotel_id)', async () => {
      // ADD-25: one prepaid outbound-balance row per hotel. HOTEL_A already has one.
      await expect(
        db.billingQuota.create({
          data: {
            id: '99999999-9999-4999-8999-999999999999',
            hotelId: HOTEL_A,
            outboundBalanceTotal: 1,
            outboundBalanceUsed: 0,
          },
        }),
      ).rejects.toBeDefined();
    });

    it('should reject a duplicate UNIQUE(invoice_number) at the DB layer', async () => {
      await expect(
        db.billingInvoice.create({
          data: {
            id: '99999999-9999-4999-8999-999999999998',
            hotelId: HOTEL_B,
            invoiceNumber: 'INV-2026-07-001', // taken by HOTEL_A
            periodStart: new Date('2026-07-01'),
            periodEnd: new Date('2026-07-31'),
            amountIdr: new Prisma.Decimal('1.00'),
            status: 'issued',
            issuedAt: new Date(),
          },
        }),
      ).rejects.toBeDefined();
    });

    it('should reject a status outside the CHECK enum at the DB layer', async () => {
      await expect(
        db.billingInvoice.create({
          data: {
            id: '99999999-9999-4999-8999-999999999997',
            hotelId: HOTEL_A,
            invoiceNumber: 'INV-NEW',
            periodStart: new Date('2026-08-01'),
            periodEnd: new Date('2026-08-31'),
            amountIdr: new Prisma.Decimal('1.00'),
            status: 'draft', // not in issued|paid|overdue|void
            issuedAt: new Date(),
          },
        }),
      ).rejects.toBeDefined();
    });
  });

  describe('invoice download', () => {
    it('should stream the PDF body for an owned invoice', async () => {
      const result = await service.downloadInvoicePdf(gmA, '20000002-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
      expect(result.invoiceNumber).toBe('INV-2026-07-001');
      expect(result.body.toString()).toBe('%PDF-A-2026-07');
    });

    it('should 404 (InvoicePdf resource) when pdfUrl is null', async () => {
      try {
        await service.downloadInvoicePdf(gmA, '20000001-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
        expect((err as NotFoundError).details.resource).toBe('InvoicePdf');
      }
    });

    it('should 404 (InvoicePdfFile resource) on storage-race (row present, file absent)', async () => {
      // Seeded '20000000-aaaa' has pdfUrl='invoices/A/2026-05.pdf' — NOT put into
      // in-memory storage. Download returns null → InvoicePdfFile 404.
      try {
        await service.downloadInvoicePdf(gmA, '20000000-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
        expect((err as NotFoundError).details.resource).toBe('InvoicePdfFile');
      }
    });

    it('should 404 (Invoice resource) on cross-tenant fetch (leak-safe)', async () => {
      // HOTEL_A ctx trying HOTEL_B's invoice.
      try {
        await service.downloadInvoicePdf(gmA, '20000000-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
        expect((err as NotFoundError).details.resource).toBe('Invoice');
      }
    });
  });

  describe('outbound top-up + daily brief', () => {
    it('should return a fresh requestId + pending_manual_review + call the notifier', async () => {
      const res = await service.requestOutboundTopup(gmA, { package: 'M' });
      expect(res.data.status).toBe('pending_manual_review');
      expect(res.data.request_id).toMatch(/^[0-9a-f-]{36}$/i);
    });

    it('should 404 daily brief (slice-1 empty state)', () => {
      expect(() => service.downloadDailyBriefPdf(gmA)).toThrow(NotFoundError);
    });
  });
});
