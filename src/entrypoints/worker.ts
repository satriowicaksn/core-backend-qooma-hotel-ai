/**
 * Entrypoint: Bull queue worker process.
 *
 * Registered processors:
 *   - `otp.check_grace` (ADD-24): fires `otp_grace_minutes` after staff DONE;
 *     grace-closes the ticket unless the guest's code was verified meanwhile
 *     (guarded no-op otherwise — see OtpService.graceClose).
 */

import { loadConfig } from '@core/config/env.js';
import { db } from '@core/prisma/prisma-client.js';
import { shutdownAllQueues } from '@core/queue/bull-factory.js';

import {
  BullGraceSchedulerAdapter,
  buildOtpServices,
  createOtpGraceQueue,
  registerOtpGraceWorker,
} from '@modules/otp/index.js';

async function main(): Promise<void> {
  loadConfig();

  const otpGraceQueue = createOtpGraceQueue();
  const { otpService } = buildOtpServices(db, {
    scheduler: new BullGraceSchedulerAdapter(otpGraceQueue),
  });
  registerOtpGraceWorker(otpGraceQueue, otpService);

  const shutdown = (): void => {
    void shutdownAllQueues().finally(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal worker error:', err);
  process.exit(1);
});
