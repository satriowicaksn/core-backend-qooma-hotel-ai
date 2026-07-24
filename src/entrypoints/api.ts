/**
 * Entrypoint: HTTP API server (Fastify).
 *
 * Wires all core modules: JWT tenant-guard + route registration per
 * CLAUDE.md §4. Each module is built via its index.ts factory (manual DI).
 *
 * Route prefixes: none — frontend strips `/api` before sending requests to
 * this service (see `src/services/http.ts` in the frontend repo).
 */

import corsPlugin from '@fastify/cors';
import jwtPlugin from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';

import { loadConfig } from '@core/config/env.js';
import { AppError } from '@core/errors/app-errors.js';
import { createLogger } from '@core/logger/logger.js';
import { db } from '@core/prisma/prisma-client.js';
import { InMemoryAdapter } from '@core/storage/in-memory-adapter.js';
import type { ObjectStoragePort } from '@core/storage/object-storage.port.js';
import { S3Adapter } from '@core/storage/s3-adapter.js';

import { agentsRoutes, buildAgentsService } from '@modules/agents/index.js';
import { analyticsRoutes, buildAnalyticsService } from '@modules/analytics/index.js';
import { billingRoutes, buildBillingService } from '@modules/billing/index.js';
import { buildDepartmentsService, departmentsRoutes } from '@modules/departments/index.js';
import { buildFeatureFlagsService, featureFlagsRoutes } from '@modules/feature-flags/index.js';
import { buildGuestsService, guestsRoutes } from '@modules/guests/index.js';
import { hotelBootstrapRoutes } from '@modules/hotel-bootstrap/index.js';
import {
  KnowledgeRepository,
  buildKnowledgeService,
  knowledgeInternalRoutes,
  knowledgeRoutes,
} from '@modules/knowledge/index.js';
import { buildMenuService, menuRoutes } from '@modules/menu/index.js';
import { buildNotificationsService, notificationsRoutes } from '@modules/notifications/index.js';
import {
  BullGraceSchedulerAdapter,
  buildOtpServices,
  createOtpGraceQueue,
  otpInternalRoutes,
  otpRoutes,
} from '@modules/otp/index.js';
import { buildTicketsService, ticketsRoutes } from '@modules/tickets/index.js';
import { buildVisitsService, visitsRoutes } from '@modules/visits/index.js';
import { buildVoiceService, voiceRoutes } from '@modules/voice/index.js';
import { buildWaTemplatesService, waTemplatesRoutes } from '@modules/wa-templates/index.js';
import { configureTenantGuardHooks } from '@plugins/tenant-guard.hooks.js';
import type { SessionRole, SessionUser } from '@plugins/tenant-guard.js';

// Side-effect: activates @fastify/jwt + Fastify type augmentations
// (req.user → SessionUser, req.tenant → TenantContext).
import '@plugins/tenant-guard.types.js';

// Access-token claims minted by auth-backend (its `SignedPayload`): `sub` is the
// userId; hotelId/deptId are null for super_admin. Distinct from SessionUser,
// so the cookie hook must map claims → SessionUser (not assign the raw payload).
interface AccessTokenClaims {
  readonly sub: string;
  readonly sid: string;
  readonly role: SessionRole;
  readonly hotelId: string | null;
  readonly deptId: string | null;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ service: 'core-api', level: config.LOG_LEVEL });

  const app = Fastify({ logger: false, trustProxy: true });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppError) {
      void reply.code(err.statusCode).send({ error: err.toJson() });
      return;
    }
    if (err.validation !== undefined) {
      void reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: err.message, details: err.validation },
      });
      return;
    }
    void reply.code(500).send({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  });

  // CORS: FE hits core-staging directly cross-origin (withCredentials). Must
  // never use '*' with credentials. CORS_ORIGIN is comma-separated to support
  // multiple origins (localhost + Vercel preview URL).
  await app.register(corsPlugin, {
    origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Correlation-Id'],
  });

  // JWT — verifies tokens issued by auth-backend (shared JWT_ACCESS_SECRET).
  await app.register(jwtPlugin, {
    secret: config.JWT_ACCESS_SECRET,
  });

  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_GLOBAL_PER_MIN,
    timeWindow: '1 minute',
  });

  // Extract JWT from httpOnly `token` cookie and populate req.user. Manual
  // parse avoids the @fastify/cookie peer-dep requirement — auth-backend owns
  // cookie issuance so this service only reads, never writes cookies.
  app.addHook('onRequest', async (req) => {
    try {
      const cookieHeader = req.headers.cookie ?? '';
      const token = /(?:^|;\s*)token=([^;]+)/.exec(cookieHeader)?.[1];
      if (token) {
        // auth signs `sub` (not `userId`) + nullable hotelId/deptId. Map onto
        // SessionUser so ctx.userId is populated — notifications, ticket/visit
        // audit and feature-flag updated_by all read ctx.userId.
        const claims = app.jwt.verify<AccessTokenClaims>(token);
        const user: SessionUser = {
          userId: claims.sub,
          hotelId: claims.hotelId ?? '',
          role: claims.role,
          ...(claims.deptId !== null ? { deptId: claims.deptId } : {}),
        };
        req.user = user;
      }
    } catch {
      // Unauthenticated — req.user stays undefined; routes throw AuthError.
    }
  });

  // Derive req.tenant from verified req.user.
  configureTenantGuardHooks(app);

  // Multipart — menu item images + menu/knowledge CSV imports. 5 MB / 1 file cap.
  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 20 },
  });

  // Object storage for menu images. S3/R2 when configured (bucket present),
  // else in-memory (dev). Fail-lazy: the S3 adapter validates creds on first use.
  const storage: ObjectStoragePort = config.S3_BUCKET
    ? new S3Adapter({
        ...(config.S3_ENDPOINT !== undefined ? { endpoint: config.S3_ENDPOINT } : {}),
        ...(config.S3_REGION !== undefined ? { region: config.S3_REGION } : {}),
        bucket: config.S3_BUCKET,
        ...(config.S3_ACCESS_KEY_ID !== undefined ? { accessKeyId: config.S3_ACCESS_KEY_ID } : {}),
        ...(config.S3_SECRET_ACCESS_KEY !== undefined
          ? { secretAccessKey: config.S3_SECRET_ACCESS_KEY }
          : {}),
      })
    : new InMemoryAdapter();

  // Shared opts for services that do cross-DB validation (Q-C-02 / T21).
  const crossDbOpts = {
    logger,
    skipCrossDbChecks: config.SKIP_CROSS_DB_CHECKS,
    nodeEnv: config.NODE_ENV,
  };

  const agentsService = buildAgentsService(db);
  const analyticsService = buildAnalyticsService(db, crossDbOpts);
  const billingService = buildBillingService(db, crossDbOpts);
  const departmentsService = buildDepartmentsService(db, crossDbOpts);
  const featureFlagsService = buildFeatureFlagsService(db, crossDbOpts);
  const guestsService = buildGuestsService(db);
  const knowledgeService = buildKnowledgeService(db);
  const knowledgeRepo = new KnowledgeRepository(db);
  const menuService = buildMenuService(db, storage);
  const notificationsService = buildNotificationsService(db);
  const ticketsService = buildTicketsService(db);
  // ADD-24: grace-timer jobs are enqueued from the API process; the worker
  // entrypoint owns the processor (see worker.ts).
  const otpGraceQueue = createOtpGraceQueue();
  const { otpService, otpCrmService } = buildOtpServices(db, {
    scheduler: new BullGraceSchedulerAdapter(otpGraceQueue),
  });
  const visitsService = buildVisitsService(db);
  const voiceService = buildVoiceService(db);
  const waTemplatesService = buildWaTemplatesService(db, { logger });

  app.get('/healthz', async () => ({ status: 'ok' }));

  await app.register(agentsRoutes, { service: agentsService });
  await app.register(analyticsRoutes, { service: analyticsService });
  await app.register(billingRoutes, { service: billingService });
  await app.register(departmentsRoutes, { service: departmentsService });
  await app.register(featureFlagsRoutes, { service: featureFlagsService });
  await app.register(guestsRoutes, { service: guestsService });
  await app.register(knowledgeRoutes, { service: knowledgeService });
  await app.register(menuRoutes, { service: menuService });
  await app.register(notificationsRoutes, { service: notificationsService });
  await app.register(otpRoutes, { service: otpCrmService });
  await app.register(otpInternalRoutes, {
    service: otpService,
    internalSecret: config.INTERNAL_API_SECRET,
    prefix: '/internal',
  });
  await app.register(hotelBootstrapRoutes, {
    db,
    internalSecret: config.INTERNAL_API_SECRET,
    prefix: '/internal',
  });
  await app.register(knowledgeInternalRoutes, {
    repo: knowledgeRepo,
    internalSecret: config.INTERNAL_API_SECRET,
    prefix: '/internal',
  });
  await app.register(ticketsRoutes, { service: ticketsService });
  await app.register(visitsRoutes, { service: visitsService });
  await app.register(voiceRoutes, { service: voiceService });
  await app.register(waTemplatesRoutes, { service: waTemplatesService });

  const shutdown = async (signal: string): Promise<void> => {
    try {
      await app.close();
      process.exit(0);
    } catch {
      process.exit(1);
    } finally {
      void signal;
    }
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ port: config.API_PORT, host: config.API_HOST });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
