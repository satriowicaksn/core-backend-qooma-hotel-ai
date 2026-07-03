// Domain + wire (snake_case) types for the settings/knowledge surface.
// Envelope: camelCase wrapper + snake_case resource body (Q-B-01 / Q-B-07).

import type { Prisma } from '@prisma/client';

export type KnowledgeEntryRow = Prisma.KnowledgeEntryGetPayload<Record<string, never>>;

export interface KnowledgeEntryWire {
  readonly id: string;
  readonly hotel_id: string;
  readonly title: string;
  readonly content: string;
  readonly category: string | null;
  readonly tags: readonly string[];
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface KnowledgeListFilters {
  readonly isActive?: boolean;
  readonly category?: string;
  readonly tag?: string;
}

export interface KnowledgeListResponse {
  readonly data: readonly KnowledgeEntryWire[];
}

export interface KnowledgeEntryResponse {
  readonly data: KnowledgeEntryWire;
}
