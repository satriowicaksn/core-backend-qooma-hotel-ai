// Serializer: Prisma row (camelCase) → wire DTO (snake_case). One-way, at the
// route boundary only.

import type { AgentRow, AgentWire } from './agents.types.js';

export function serializeAgent(row: AgentRow): AgentWire {
  const config =
    typeof row.config === 'object' && row.config !== null && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};
  return {
    id: row.id,
    hotel_id: row.hotelId,
    agent_type: row.agentType,
    name: row.name,
    is_active: row.isActive,
    capacity: row.capacity,
    config,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
