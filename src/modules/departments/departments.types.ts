// Domain + wire (snake_case) types for the settings/departments surface.
// Envelope: camelCase wrapper + snake_case resource body (Q-B-01 / Q-B-07).

import type { Prisma } from '@prisma/client';

export type DepartmentRow = Prisma.DepartmentGetPayload<Record<string, never>>;

// Escalation chain JSONB shape — spec §1.5:191-207. l2/l3 user_id are Auth-service
// UUIDs (format-only validation under Opsi C — no cross-DB existence check).
export interface EscalationChain {
  readonly l1_sla_minutes: number;
  readonly l2_user_id?: string;
  readonly l2_sla_minutes?: number;
  readonly l3_user_id?: string;
  readonly skip_to_l3_categories?: readonly string[];
}

// Operating hours JSONB — permissive shape (Q-C-01 resolution). Forward-compat
// until FE MSW contract lands.
export type OperatingHours = Record<string, unknown>;

// Wire shape — spec §2.1 field set. hotel_id sourced from tenant (never body).
export interface DepartmentWire {
  readonly id: string;
  readonly hotel_id: string;
  readonly name: string;
  readonly code: string;
  readonly operating_hours: OperatingHours;
  readonly escalation_chain: EscalationChain | Record<string, never>;
  readonly telegram_chat_id: string | null;
  readonly supervisor_telegram_id: string | null;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface DepartmentListFilters {
  readonly isActive?: boolean;
}

export interface DepartmentListResponse {
  readonly data: readonly DepartmentWire[];
}

export interface DepartmentResponse {
  readonly data: DepartmentWire;
}
