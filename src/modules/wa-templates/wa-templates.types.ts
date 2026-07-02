// Domain + wire (snake_case) types for the WhatsApp Templates surface.
// Envelope: camelCase wrapper + snake_case resource body (Q-B-01 / Q-B-07).

import type { Prisma } from '@prisma/client';

export type WaTemplateRow = Prisma.WaTemplateGetPayload<Record<string, never>>;

// Migration CHECK: status IN ('pending','approved','rejected','archived').
export type WaTemplateStatus = 'pending' | 'approved' | 'rejected' | 'archived';

// Wire shape — spec §2.8 field set.
export interface WaTemplateWire {
  readonly id: string;
  readonly hotel_id: string | null;
  readonly name: string;
  readonly body: string;
  readonly variables: readonly string[];
  readonly language: string;
  readonly status: WaTemplateStatus;
  readonly template_id_meta: string | null;
  readonly rejection_reason: string | null;
  readonly is_global: boolean;
  readonly approved_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface WaTemplateListFilters {
  readonly status?: WaTemplateStatus;
}

export interface WaTemplateListResponse {
  readonly data: readonly WaTemplateWire[];
}

export interface WaTemplateResponse {
  readonly data: WaTemplateWire;
}
