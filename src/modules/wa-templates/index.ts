// Public API of the wa-templates module. Internal units stay unexported —
// bootstrap wires via buildWaTemplatesService.

import type { PrismaClient } from '@prisma/client';

import type { Logger } from '@core/logger/logger.js';

// eslint-disable-next-line no-restricted-imports -- barrel/factory is the sanctioned wiring seam; service still consumes port only
import { LogOnlyIntegrationRelayAdapter } from './adapters/log-only-integration-relay.adapter.js';
import type { IntegrationRelayPort } from './ports/integration-relay.port.js';
import { WaTemplatesRepository } from './wa-templates.repository.js';
import { WaTemplatesService } from './wa-templates.service.js';

export { waTemplatesRoutes, type WaTemplatesRoutesOptions } from './wa-templates.routes.js';
export { WaTemplatesService } from './wa-templates.service.js';
// eslint-disable-next-line no-restricted-imports -- barrel re-export lets bootstrap wire adapter at composition root; service depends on port only
export { LogOnlyIntegrationRelayAdapter } from './adapters/log-only-integration-relay.adapter.js';
export type {
  IntegrationRelayPort,
  IntegrationRelayResult,
  IntegrationRelaySubmitInput,
} from './ports/integration-relay.port.js';
export type { CreateWaTemplateBody, UpdateWaTemplateBody } from './wa-templates.schema.js';
export type {
  WaTemplateListResponse,
  WaTemplateResponse,
  WaTemplateStatus,
  WaTemplateWire,
} from './wa-templates.types.js';

export interface BuildWaTemplatesServiceOptions {
  readonly logger: Logger;
  readonly integrationRelay?: IntegrationRelayPort;
}

export function buildWaTemplatesService(
  db: PrismaClient,
  opts: BuildWaTemplatesServiceOptions,
): WaTemplatesService {
  const relay = opts.integrationRelay ?? new LogOnlyIntegrationRelayAdapter(opts.logger);
  return new WaTemplatesService(new WaTemplatesRepository(db), relay);
}
