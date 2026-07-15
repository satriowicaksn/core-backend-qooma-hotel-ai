import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import Fastify, { type FastifyInstance } from 'fastify';

import { AppError, NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { billingRoutes } from '../billing.routes.js';
import type { BillingService, InvoicePdfResult } from '../billing.service.js';
import type { BillingOverviewResponse, UpgradeRequestResponse } from '../billing.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INVOICE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const OVERVIEW_RESULT: BillingOverviewResponse = {
  data: {
    tier: null,
    active_crm_users: 0,
    quota: null,
    invoices: [],
    extras: [],
    daily_brief_pdf_url_latest: null,
  },
};

const UPGRADE_RESULT: UpgradeRequestResponse = {
  data: {
    request_id: '00000000-0000-4000-8000-000000000000',
    status: 'pending_manual_review',
    requested_at: '2026-07-03T00:00:00.000Z',
  },
};

interface Recorder {
  overviewCtx?: TenantContext;
  upgradeTarget?: string;
  invoiceId?: string;
  dailyBriefHit?: boolean;
  invoiceResult?: InvoicePdfResult;
  downloadThrow?: Error;
}

function buildApp(tenant: TenantContext | undefined, recorder: Recorder): FastifyInstance {
  const service = {
    overview: (ctx: TenantContext): Promise<BillingOverviewResponse> => {
      recorder.overviewCtx = ctx;
      return Promise.resolve(OVERVIEW_RESULT);
    },
    requestUpgrade: (
      _ctx: TenantContext,
      body: { target_tier: string },
    ): Promise<UpgradeRequestResponse> => {
      recorder.upgradeTarget = body.target_tier;
      return Promise.resolve(UPGRADE_RESULT);
    },
    downloadInvoicePdf: (_ctx: TenantContext, id: string): Promise<InvoicePdfResult> => {
      recorder.invoiceId = id;
      if (recorder.downloadThrow) {
        return Promise.reject(recorder.downloadThrow);
      }
      return Promise.resolve(
        recorder.invoiceResult ?? {
          invoiceNumber: 'INV-2026-07-001',
          body: Buffer.from('%PDF-1.4'),
        },
      );
    },
    downloadDailyBriefPdf: (_ctx: TenantContext): never => {
      recorder.dailyBriefHit = true;
      throw new NotFoundError('DailyBrief', 'latest');
    },
  } as unknown as BillingService;

  const app = Fastify();
  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send(err.toJson());
    }
    return reply.code(500).send({ error: 'internal' });
  });
  app.addHook('preHandler', (req, _reply, done) => {
    req.tenant = tenant;
    done();
  });
  void app.register(billingRoutes, { service });
  return app;
}

const GM: TenantContext = {
  userId: USER_ID,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const DEPT_HEAD: TenantContext = { ...GM, role: 'dept_head', deptId: 'x' };
const STAFF: TenantContext = { ...GM, role: 'staff' };
const SUPER: TenantContext = { ...GM, role: 'super_admin', isSuperAdmin: true };

describe('billingRoutes', () => {
  let app: FastifyInstance;
  let recorder: Recorder;

  beforeEach(() => {
    recorder = {};
  });

  afterEach(async () => {
    await app.close();
  });

  describe('overview', () => {
    it('should GET /settings/billing', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/billing' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual(OVERVIEW_RESULT);
      expect(recorder.overviewCtx).toEqual(GM);
    });

    it('should 401 without tenant', async () => {
      app = buildApp(undefined, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/billing' });
      expect(res.statusCode).toBe(401);
    });

    it('should 403 for dept_head', async () => {
      app = buildApp(DEPT_HEAD, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/billing' });
      expect(res.statusCode).toBe(403);
    });

    it('should 403 for staff', async () => {
      app = buildApp(STAFF, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/billing' });
      expect(res.statusCode).toBe(403);
    });

    it('should allow super_admin', async () => {
      app = buildApp(SUPER, recorder);
      const res = await app.inject({ method: 'GET', url: '/settings/billing' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('upgrade', () => {
    it('should POST /billing/upgrade-package and return 202', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/billing/upgrade-package',
        payload: { target_tier: 'luxury' },
      });
      expect(res.statusCode).toBe(202);
      expect(recorder.upgradeTarget).toBe('luxury');
    });

    it('should 400 on lite target (Q-T27-#2)', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/billing/upgrade-package',
        payload: { target_tier: 'lite' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on missing target_tier', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/billing/upgrade-package',
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it('should 400 on unknown field (strict)', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/billing/upgrade-package',
        payload: { target_tier: 'luxury', notes: 'urgent' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('invoice download', () => {
    it('should stream PDF with Content-Type + sanitized Content-Disposition', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: `/billing/invoices/${INVOICE_ID}/download`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="invoice-INV-2026-07-001.pdf"',
      );
      expect(res.rawPayload.toString()).toBe('%PDF-1.4');
      expect(recorder.invoiceId).toBe(INVOICE_ID);
    });

    it('should sanitize malformed invoiceNumber into Content-Disposition', async () => {
      recorder = {
        invoiceResult: {
          invoiceNumber: 'INV/2026 "07"; nasty',
          body: Buffer.from('x'),
        },
      };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: `/billing/invoices/${INVOICE_ID}/download`,
      });
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="invoice-INV_2026__07___nasty.pdf"',
      );
    });

    it('should 404 when service throws NotFoundError (row / pdfUrl / storage-race)', async () => {
      recorder = { downloadThrow: new NotFoundError('InvoicePdf', INVOICE_ID) };
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: `/billing/invoices/${INVOICE_ID}/download`,
      });
      expect(res.statusCode).toBe(404);
    });

    it('should 400 on non-uuid invoice id', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'POST',
        url: '/billing/invoices/not-a-uuid/download',
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('daily brief', () => {
    it('should 404 with resource DailyBrief in slice-1', async () => {
      app = buildApp(GM, recorder);
      const res = await app.inject({
        method: 'GET',
        url: '/billing/daily-brief/latest.pdf',
      });
      expect(res.statusCode).toBe(404);
      expect(recorder.dailyBriefHit).toBe(true);
    });
  });
});
