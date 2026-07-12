/**
 * Entrypoint: HTTP API server (Fastify).
 *
 * Wires: config → logger → plugins (helmet, cors, auth) → error handler →
 * healthz → module routes (all under `/api`) → listen.
 *
 * Auth: `registerAuth` validates the auth-service `token` cookie and populates
 * `req.tenant`; module routes enforce tenant/role via that context.
 */

import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';

import { loadConfig } from '@core/config/env.js';
import { AppError } from '@core/errors/app-errors.js';
import { createLogger } from '@core/logger/logger.js';
import { db } from '@core/prisma/prisma-client.js';


import { agentsRoutes, buildAgentsService } from '@modules/agents/index.js';
import { analyticsRoutes, buildAnalyticsService } from '@modules/analytics/index.js';
import { billingRoutes, buildBillingService } from '@modules/billing/index.js';
import { departmentsRoutes, buildDepartmentsService } from '@modules/departments/index.js';
import { featureFlagsRoutes, buildFeatureFlagsService } from '@modules/feature-flags/index.js';
import { guestsRoutes, buildGuestsService } from '@modules/guests/index.js';
import { knowledgeRoutes, buildKnowledgeService } from '@modules/knowledge/index.js';
import { menuRoutes, buildMenuService } from '@modules/menu/index.js';
import { notificationsRoutes, buildNotificationsService } from '@modules/notifications/index.js';
import { ticketsRoutes, buildTicketsService } from '@modules/tickets/index.js';
import { visitsRoutes, buildVisitsService } from '@modules/visits/index.js';
import { voiceRoutes, buildVoiceService } from '@modules/voice/index.js';
import { waTemplatesRoutes, buildWaTemplatesService } from '@modules/wa-templates/index.js';
import { registerAuth } from '@plugins/auth.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ service: 'api', level: config.LOG_LEVEL });

  const fastify = Fastify({
    logger: { level: config.LOG_LEVEL },
    trustProxy: true,
  });

  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
  });

  await registerAuth(fastify, config.JWT_ACCESS_SECRET);

  fastify.setErrorHandler((err, req, reply) => {
    if (err instanceof AppError) {
      return reply.code(err.statusCode).send({ error: err.toJson() });
    }
    req.log.error({ err }, 'unhandled error');
    return reply
      .code(500)
      .send({ error: { code: 'INTERNAL', message: 'Internal server error', details: {} } });
  });

  fastify.get('/healthz', async () => ({ status: 'ok' }));

  const svcOpts = {
    logger,
    skipCrossDbChecks: config.SKIP_CROSS_DB_CHECKS,
    nodeEnv: config.NODE_ENV,
  };
  const prefix = '/api';

  // Simple (db-only) modules
  await fastify.register(ticketsRoutes, { prefix, service: buildTicketsService(db) });
  await fastify.register(guestsRoutes, { prefix, service: buildGuestsService(db) });
  await fastify.register(visitsRoutes, { prefix, service: buildVisitsService(db) });
  await fastify.register(notificationsRoutes, {
    prefix,
    service: buildNotificationsService(db),
  });
  await fastify.register(menuRoutes, { prefix, service: buildMenuService(db) });
  await fastify.register(knowledgeRoutes, { prefix, service: buildKnowledgeService(db) });
  await fastify.register(agentsRoutes, { prefix, service: buildAgentsService(db) });
  await fastify.register(voiceRoutes, { prefix, service: buildVoiceService(db) });

  // Modules needing logger/config options
  await fastify.register(departmentsRoutes, {
    prefix,
    service: buildDepartmentsService(db, svcOpts),
  });
  await fastify.register(analyticsRoutes, {
    prefix,
    service: buildAnalyticsService(db, svcOpts),
  });
  await fastify.register(featureFlagsRoutes, {
    prefix,
    service: buildFeatureFlagsService(db, svcOpts),
  });
  await fastify.register(billingRoutes, { prefix, service: buildBillingService(db, svcOpts) });
  await fastify.register(waTemplatesRoutes, {
    prefix,
    service: buildWaTemplatesService(db, svcOpts),
  });

  await fastify.listen({ port: config.API_PORT, host: config.API_HOST });
  logger.info({ msg: 'api.listening', port: config.API_PORT, host: config.API_HOST });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
