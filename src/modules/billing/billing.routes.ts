// HTTP routes — thin: guard session → RBAC → validate → service → send.
// Q-T27-#4: Content-Disposition filename sanitized to [A-Za-z0-9._-] as
// defense-in-depth against header injection.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { AuthError } from '@core/errors/app-errors.js';

import { requireRole } from '@plugins/rbac.js';
import type { TenantContext } from '@plugins/tenant-guard.js';

import { parseInvoiceId, parseUpgradePackageBody } from './billing.schema.js';
import type { BillingService } from './billing.service.js';

export interface BillingRoutesOptions {
  readonly service: BillingService;
}

const ALLOWED_ROLES = ['gm_admin'] as const;

function requireTenant(tenant: TenantContext | undefined): TenantContext {
  if (!tenant) {
    throw new AuthError('No authenticated session');
  }
  return tenant;
}

function correlationIdOf(req: FastifyRequest): string {
  const header = req.headers['x-correlation-id'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  return req.id;
}

// Sanitize filename to [A-Za-z0-9._-]; non-matching chars → `_`. Prevents
// header injection even though `invoiceNumber` is a constrained DB column.
function sanitizeFilename(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

export const billingRoutes: FastifyPluginCallback<BillingRoutesOptions> = (fastify, opts, done) => {
  const { service } = opts;

  fastify.get('/settings/billing', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    req.log.info(
      { module: 'billing', action: 'overview', correlationId: correlationIdOf(req) },
      'billing overview',
    );
    const result = await service.overview(ctx);
    return reply.send(result);
  });

  fastify.post('/billing/upgrade-package', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const body = parseUpgradePackageBody(req.body);
    req.log.info(
      {
        module: 'billing',
        action: 'upgrade',
        targetTier: body.target_tier,
        correlationId: correlationIdOf(req),
      },
      'upgrade request',
    );
    const result = await service.requestUpgrade(ctx, body);
    return reply.code(202).send(result);
  });

  fastify.get('/billing/invoices/:id/download', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    const id = parseInvoiceId(req.params);
    req.log.info(
      {
        module: 'billing',
        action: 'invoice_download',
        invoiceId: id,
        correlationId: correlationIdOf(req),
      },
      'invoice download',
    );
    const { invoiceNumber, body } = await service.downloadInvoicePdf(ctx, id);
    const filename = `invoice-${sanitizeFilename(invoiceNumber)}.pdf`;
    return reply
      .type('application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(body);
  });

  fastify.get('/billing/daily-brief/latest.pdf', async (req, reply) => {
    const ctx = requireTenant(req.tenant);
    requireRole(ctx, ALLOWED_ROLES);
    req.log.info(
      {
        module: 'billing',
        action: 'daily_brief_download',
        correlationId: correlationIdOf(req),
      },
      'daily brief download',
    );
    // Slice-1: W3 worker not built. Service throws 404 → error-handler
    // translates. No streaming path.
    service.downloadDailyBriefPdf(ctx);
    // Unreachable — service throws. Keep TS happy.
    return reply.code(500).send();
  });

  done();
};
