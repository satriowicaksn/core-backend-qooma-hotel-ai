// Public API of the analytics module. Internal units stay unexported —
// bootstrap wires via buildAnalyticsService.

import type { PrismaClient } from '@prisma/client';

import type { Logger } from '@core/logger/logger.js';

import { AnalyticsRepository } from './analytics.repository.js';
import { AnalyticsService } from './analytics.service.js';

export { analyticsRoutes, type AnalyticsRoutesOptions } from './analytics.routes.js';
export { AnalyticsService } from './analytics.service.js';
export type {
  AnalyticsMetaWire,
  DepartmentPerformancePoint,
  DepartmentPerformanceResponse,
  DepartmentRefWire,
  HighAlertDeptWire,
  HighAlertResponse,
  HighAlertSummary,
  OverviewKpiWire,
  OverviewResponse,
  PeakHoursBucket,
  PeakHoursResponse,
  PeriodBucket,
  RecommendationKey,
  SatisfactionPoint,
  SatisfactionResponse,
  TicketVolumeBucket,
  TicketsTimeSeriesResponse,
  TopRequest,
  TopRequestsResponse,
} from './analytics.types.js';

export interface BuildAnalyticsServiceOptions {
  readonly logger: Logger;
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
}

export function buildAnalyticsService(
  db: PrismaClient,
  opts: BuildAnalyticsServiceOptions,
): AnalyticsService {
  return new AnalyticsService(new AnalyticsRepository(db), {
    logger: opts.logger,
    skipCrossDbChecks: opts.skipCrossDbChecks,
    nodeEnv: opts.nodeEnv,
  });
}
