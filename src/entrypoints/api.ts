/**
 * Entrypoint: HTTP API server (Fastify).
 *
 * Minimal boot — only `/healthz` is wired here so the pod passes k8s
 * readiness/liveness while modules land incrementally. Feature routes
 * will be registered here as they graduate to the wiring boundary
 * (see CLAUDE.md §4).
 */

import Fastify from 'fastify';

import { loadConfig } from '@core/config/env.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const app = Fastify({
    logger: false,
    trustProxy: true,
  });

  app.get('/healthz', async () => ({ status: 'ok' }));

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
