// Public API of the guests module. Internal units (repository, serializer,
// schema helpers) stay unexported — bootstrap wires via buildGuestsService.

import type { PrismaClient } from '@prisma/client';

import { GuestsRepository } from './guests.repository.js';
import { GuestsService } from './guests.service.js';

export { guestsRoutes, type GuestsRoutesOptions } from './guests.routes.js';
export { GuestsService } from './guests.service.js';
export type {
  GuestDetailResponse,
  GuestDetailWire,
  GuestListResponse,
  GuestMessagesResponse,
  GuestResponse,
  GuestWire,
  MessageWire,
  PreferenceWire,
  PreferencesResponse,
  VisitWire,
} from './guests.types.js';

export function buildGuestsService(db: PrismaClient): GuestsService {
  return new GuestsService(new GuestsRepository(db));
}
