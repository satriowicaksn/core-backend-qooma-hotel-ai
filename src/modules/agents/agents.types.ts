// Domain + wire (snake_case) types for the AI-agents config surface.
// Envelope: camelCase wrapper + snake_case resource body (Q-B-01 / Q-B-07).

import type { Prisma } from '@prisma/client';

export type AgentRow = Prisma.AiAgentConfigGetPayload<Record<string, never>>;

export interface AgentWire {
  readonly id: string;
  readonly hotel_id: string;
  readonly agent_type: string;
  readonly name: string;
  readonly is_active: boolean;
  readonly capacity: number;
  readonly config: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AgentListFilters {
  readonly isActive?: boolean;
}

export interface AgentListResponse {
  readonly data: readonly AgentWire[];
}

export interface AgentResponse {
  readonly data: AgentWire;
}
