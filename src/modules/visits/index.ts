// Public API of the visits module. Internal units (repository, serializer,
// schema helpers) stay unexported — bootstrap wires via buildVisitsService.

import type { PrismaClient } from '@prisma/client';

import { VisitsRepository } from './visits.repository.js';
import { VisitsService, type VisitsServiceDeps } from './visits.service.js';

export { visitsRoutes, type VisitsRoutesOptions } from './visits.routes.js';
export { VisitsService, type VisitsServiceDeps } from './visits.service.js';
export type {
  OffsetPageInfoWire,
  VisitDetailResponse,
  VisitListResponse,
  VisitWire,
} from './visits.types.js';

export function buildVisitsService(db: PrismaClient, deps: VisitsServiceDeps = {}): VisitsService {
  return new VisitsService(new VisitsRepository(db), deps);
}
