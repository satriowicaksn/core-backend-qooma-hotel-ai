// Domain + wire (snake_case) types for the settings/voice groundwork surface.
// Slice-1 is groundwork per spec §1.5 "wave 2a" defer + MVP §101 stub-endpoint.

import type { Prisma } from '@prisma/client';

export type VoiceConfigRow = Prisma.VoiceConfigGetPayload<Record<string, never>>;

// Wire shape — spec §2.12 field set. hotel_id included per T21/T25 wire
// convention (PM ACK note). `updated_at` nullable so the empty-default (no
// row yet) has a uniform shape.
export interface VoiceConfigWire {
  readonly hotel_id: string;
  readonly pbx_type: string | null;
  readonly config: Record<string, unknown>;
  readonly is_active: boolean;
  readonly updated_at: string | null;
}

export interface VoiceConfigResponse {
  readonly data: VoiceConfigWire;
}

export interface VoiceTestResultWire {
  readonly success: boolean;
  readonly note: string;
}

export interface VoiceTestResponse {
  readonly data: VoiceTestResultWire;
}
