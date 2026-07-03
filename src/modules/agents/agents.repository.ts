// Repository: Prisma direct (no interface — ADR-0001).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { AgentRow } from './agents.types.js';

export class AgentsRepository {
  constructor(private readonly db: PrismaClient) {}

  async findMany(where: Prisma.AiAgentConfigWhereInput): Promise<AgentRow[]> {
    return this.db.aiAgentConfig.findMany({
      where,
      orderBy: [{ agentType: 'asc' }],
    });
  }

  async findById(id: string): Promise<AgentRow | null> {
    return this.db.aiAgentConfig.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.AiAgentConfigUncheckedUpdateInput): Promise<AgentRow> {
    return this.db.aiAgentConfig.update({ where: { id }, data });
  }
}
