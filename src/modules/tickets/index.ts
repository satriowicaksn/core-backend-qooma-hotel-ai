// Public API of the tickets module. Internal units (repository, serializer,
// schema helpers) stay unexported — bootstrap wires via buildTicketsService.

import type { PrismaClient } from '@prisma/client';

import { TicketsRepository } from './tickets.repository.js';
import { TicketsService, type TicketsServiceDeps } from './tickets.service.js';

export { ticketsRoutes, type TicketsRoutesOptions } from './tickets.routes.js';
export { TicketsService, type TicketsServiceDeps } from './tickets.service.js';
export type {
  OverdueListResponse,
  TicketDetailResponse,
  TicketDetailWire,
  TicketListItemWire,
  TicketListResponse,
  TicketMessageWire,
  TicketStatsResponse,
  TicketStatsWire,
  TicketUpdateWire,
  UserDirectory,
} from './tickets.types.js';

export function buildTicketsService(
  db: PrismaClient,
  deps: TicketsServiceDeps = {},
): TicketsService {
  return new TicketsService(new TicketsRepository(db), deps);
}
