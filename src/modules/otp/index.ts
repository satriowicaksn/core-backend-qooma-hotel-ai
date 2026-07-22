// Public API of the OTP module (ADD-24). Internal units (repository,
// serializer, schema helpers) stay unexported — bootstrap wires via
// buildOtpServices. `evaluateRequiresOtp` + `OtpService.generateOtpForTicket`
// + `OtpService.linkComplaintToSkippedTickets` are the seams for whichever
// runtime ticket-creation path lands later (none exists in this repo today).

import type { PrismaClient } from '@prisma/client';

import { OtpCrmService, type OtpCrmServiceDeps } from './otp-crm.service.js';
import { OtpRepository } from './otp.repository.js';
import { OtpService, type OtpServiceDeps } from './otp.service.js';
import type { GraceSchedulerPort } from './ports/grace-scheduler.port.js';

export { otpRoutes, type OtpRoutesOptions } from './otp.routes.js';
export { otpInternalRoutes, type OtpInternalRoutesOptions } from './otp.internal.routes.js';
export { evaluateRequiresOtp, OtpService, type OtpServiceDeps } from './otp.service.js';
export { OtpCrmService, type OtpCrmServiceDeps } from './otp-crm.service.js';
export { createOtpGraceQueue, registerOtpGraceWorker, OTP_GRACE_QUEUE } from './otp.jobs.js';
// eslint-disable-next-line no-restricted-imports -- barrel re-export lets bootstrap wire adapter at composition root; service depends on port only
export { BullGraceSchedulerAdapter } from './adapters/bull-grace-scheduler.adapter.js';
// eslint-disable-next-line no-restricted-imports -- job-data type rides the adapter file; type-only export
export type { OtpGraceJobData } from './adapters/bull-grace-scheduler.adapter.js';
export type { GraceSchedulerPort, GraceScheduleInput } from './ports/grace-scheduler.port.js';
export type {
  OtpMetricsResponse,
  OtpSettings,
  OtpSettingsResponse,
  OtpSkipReason,
  OtpVerifyResult,
  ReviewOutcome,
  ReviewQueueResponse,
  ReviewResponse,
  ReviewStatus,
} from './otp.types.js';

export interface BuildOtpServicesOptions extends OtpServiceDeps, OtpCrmServiceDeps {
  readonly scheduler: GraceSchedulerPort;
}

export function buildOtpServices(
  db: PrismaClient,
  opts: BuildOtpServicesOptions,
): { otpService: OtpService; otpCrmService: OtpCrmService } {
  const repo = new OtpRepository(db);
  const serviceDeps: OtpServiceDeps = {
    ...(opts.emitter !== undefined ? { emitter: opts.emitter } : {}),
  };
  const crmDeps: OtpCrmServiceDeps = {
    ...(opts.emitter !== undefined ? { emitter: opts.emitter } : {}),
    ...(opts.resolveUsers !== undefined ? { resolveUsers: opts.resolveUsers } : {}),
  };
  return {
    otpService: new OtpService(repo, opts.scheduler, serviceDeps),
    otpCrmService: new OtpCrmService(repo, crmDeps),
  };
}
