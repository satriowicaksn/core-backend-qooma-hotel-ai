// Public API of the agents module. Internal units stay unexported —
// bootstrap wires via buildAgentsService.

import type { PrismaClient } from '@prisma/client';

import { AgentsRepository } from './agents.repository.js';
import { AgentsService } from './agents.service.js';

export { agentsRoutes, type AgentsRoutesOptions } from './agents.routes.js';
export { AgentsService } from './agents.service.js';
export type { UpdateAgentBody } from './agents.schema.js';
export type { AgentListResponse, AgentResponse, AgentWire } from './agents.types.js';

export function buildAgentsService(db: PrismaClient): AgentsService {
  return new AgentsService(new AgentsRepository(db), db);
}
