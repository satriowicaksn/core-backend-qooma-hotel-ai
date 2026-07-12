// Public API of the knowledge module. Internal units stay unexported —
// bootstrap wires via buildKnowledgeService.

import type { PrismaClient } from '@prisma/client';

import { KnowledgeRepository } from './knowledge.repository.js';
import { KnowledgeService } from './knowledge.service.js';

export { knowledgeRoutes, type KnowledgeRoutesOptions } from './knowledge.routes.js';
export { KnowledgeService } from './knowledge.service.js';
export type { CreateEntryBody, UpdateEntryBody } from './knowledge.schema.js';
export type {
  KnowledgeEntryResponse,
  KnowledgeEntryWire,
  KnowledgeImportResponse,
  KnowledgeListResponse,
} from './knowledge.types.js';

export function buildKnowledgeService(db: PrismaClient): KnowledgeService {
  return new KnowledgeService(new KnowledgeRepository(db));
}
