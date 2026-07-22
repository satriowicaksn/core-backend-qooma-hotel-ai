import type { Queue } from 'bull';

import type { GraceScheduleInput, GraceSchedulerPort } from '../ports/grace-scheduler.port.js';

export interface OtpGraceJobData {
  readonly ticketId: string;
  readonly scheduledFor: string;
}

// Deterministic jobId makes double-DONE non-destructive: Bull silently
// ignores an `add` whose jobId already exists, so the first grace timer wins
// (ADD-24.3 idempotency — "re-scheduling or ignoring second call both fine").
export class BullGraceSchedulerAdapter implements GraceSchedulerPort {
  constructor(private readonly queue: Queue<OtpGraceJobData>) {}

  async schedule(input: GraceScheduleInput): Promise<void> {
    await this.queue.add(
      { ticketId: input.ticketId, scheduledFor: input.scheduledFor.toISOString() },
      { delay: input.delayMs, jobId: `otp.grace:${input.ticketId}` },
    );
  }
}
