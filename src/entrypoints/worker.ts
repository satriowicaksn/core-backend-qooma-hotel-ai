/**
 * Entrypoint: Bull queue worker process.
 *
 * Minimal boot — validates env + stays alive so the k8s Deployment
 * does not CrashLoop while queue processors land incrementally
 * (see CLAUDE.md §4 + docs/spec/02-hotel-core.md).
 */

import { loadConfig } from '@core/config/env.js';

async function main(): Promise<void> {
  loadConfig();

  // Keep the process alive; replace with `queue.process(...)` registrations
  // once modules with queue producers ship.
  const keepAlive = setInterval(() => {
    /* idle */
  }, 1 << 30);

  const shutdown = (): void => {
    clearInterval(keepAlive);
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal worker error:', err);
  process.exit(1);
});
