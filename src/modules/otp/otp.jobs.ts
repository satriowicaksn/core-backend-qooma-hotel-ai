// Bull wiring for the OTP grace timer (queue name per `<domain>.<action>`
// convention). Job data carries minimal context — the processor re-hydrates
// the ticket and graceClose() is a guarded no-op when the code was verified
// or the ticket already closed in the meantime.

import type { Queue } from 'bull';

import { createQueue, registerWorker } from '@core/queue/bull-factory.js';

// eslint-disable-next-line no-restricted-imports -- jobs file is the sanctioned wiring seam for the queue adapter's job-data shape
import type { OtpGraceJobData } from './adapters/bull-grace-scheduler.adapter.js';
import type { OtpService } from './otp.service.js';

export const OTP_GRACE_QUEUE = 'otp.check_grace';

export function createOtpGraceQueue(): Queue<OtpGraceJobData> {
  return createQueue<OtpGraceJobData>(OTP_GRACE_QUEUE);
}

export function registerOtpGraceWorker(queue: Queue<OtpGraceJobData>, service: OtpService): void {
  // Callback style per bull-factory's ProcessCallbackFunction contract;
  // errors flow to done() → Bull retry policy.
  registerWorker(queue, (job, done) => {
    service.graceClose(job.data.ticketId, 'grace_timeout').then(
      () => done(),
      (err: Error) => done(err),
    );
  });
}
