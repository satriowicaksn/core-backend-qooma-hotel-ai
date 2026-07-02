// Public API of the departments module. Internal units stay unexported —
// bootstrap wires via buildDepartmentsService.

import type { PrismaClient } from '@prisma/client';

import type { Logger } from '@core/logger/logger.js';

import { DepartmentsRepository } from './departments.repository.js';
import { DepartmentsService } from './departments.service.js';

export { departmentsRoutes, type DepartmentsRoutesOptions } from './departments.routes.js';
export { DepartmentsService } from './departments.service.js';
export type {
  DepartmentListResponse,
  DepartmentResponse,
  DepartmentWire,
  EscalationChain,
  OperatingHours,
} from './departments.types.js';
export type { CreateDepartmentBody, UpdateDepartmentBody } from './departments.schema.js';

export interface BuildDepartmentsServiceOptions {
  readonly skipCrossDbChecks: boolean;
  readonly nodeEnv: string;
  readonly logger?: Logger;
}

export function buildDepartmentsService(
  db: PrismaClient,
  opts: BuildDepartmentsServiceOptions,
): DepartmentsService {
  return new DepartmentsService(new DepartmentsRepository(db), opts);
}
