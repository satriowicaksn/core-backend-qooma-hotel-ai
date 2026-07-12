// Domain + wire (snake_case) types for the settings/knowledge surface.
// Envelope: camelCase wrapper + snake_case resource body (Q-B-01 / Q-B-07).

import type { Prisma } from '@prisma/client';

export type KnowledgeEntryRow = Prisma.KnowledgeEntryGetPayload<Record<string, never>>;

// FE (settings.content.api.ts) is the canonical contract: it reads
// `question`/`answer`/`keywords`/`usage_count`. The DB columns are
// `title`/`content`/`tags`; we expose both sets so neither the DB-shaped
// callers nor the FE shim break. `usage_count` has no DB column yet → 0.
export interface KnowledgeEntryWire {
  readonly id: string;
  readonly hotel_id: string;
  readonly title: string;
  readonly content: string;
  readonly question: string;
  readonly answer: string;
  readonly category: string | null;
  readonly tags: readonly string[];
  readonly keywords: readonly string[];
  readonly usage_count: number;
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

export interface KnowledgeImportRowError {
  readonly row: number;
  readonly reason: string;
}

export interface KnowledgeImportResponse {
  readonly imported: number;
  readonly skipped: number;
  readonly errors: readonly KnowledgeImportRowError[];
}
