// Public API of the feature-flags module. Internal units stay unexported —
// bootstrap wires via buildFeatureFlagsService.

import type { PrismaClient } from '@prisma/client';

import type { Logger } from '@core/logger/logger.js';

import { FeatureFlagsRepository } from './feature-flags.repository.js';
import { FeatureFlagsService } from './feature-flags.service.js';

export { featureFlagsRoutes, type FeatureFlagsRoutesOptions } from './feature-flags.routes.js';
export { FeatureFlagsService } from './feature-flags.service.js';
export { KNOWN_FLAGS, type KnownFlag } from './feature-flags.constants.js';
export type { UpdateFlagBody } from './feature-flags.schema.js';
export type {
  FeatureFlagListResponse,
  FeatureFlagResponse,
  FeatureFlagWire,
} from './feature-flags.types.js';

export interface BuildFeatureFlagsServiceOptions {
  readonly logger: Logger;
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
}

export function buildFeatureFlagsService(
  db: PrismaClient,
  opts: BuildFeatureFlagsServiceOptions,
): FeatureFlagsService {
  return new FeatureFlagsService(new FeatureFlagsRepository(db), {
    logger: opts.logger,
    skipCrossDbChecks: opts.skipCrossDbChecks,
    nodeEnv: opts.nodeEnv,
  });
}
