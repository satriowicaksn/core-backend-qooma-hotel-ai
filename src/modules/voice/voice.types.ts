// Domain + wire (snake_case) types for the settings/voice groundwork surface.
// Slice-1 is groundwork per spec §1.5 "wave 2a" defer + MVP §101 stub-endpoint.

import type { Prisma } from '@prisma/client';

export type VoiceConfigRow = Prisma.VoiceConfigGetPayload<Record<string, never>>;

export type SipCodec = 'g711a' | 'g711u' | 'opus';

// Wire shape — flat per the FE VoiceSettings contract (frontend src/types/api.ts).
// The SIP detail fields are surfaced at the top level AND retained inside the
// opaque `config` blob (the Prisma model only persists `config`). hotel_id +
// `config` kept for T21/T25 wire convention + FE back-compat (its shim still
// reads SIP details out of `config`). `updated_at` nullable so the empty-default
// (no row yet) has a uniform shape.
export interface VoiceConfigWire {
  readonly hotel_id: string;
  readonly pbx_type: string | null;
  readonly pbx_host: string;
  readonly sip_username: string;
  readonly sip_password: string;
  readonly sip_port: number;
  readonly sip_codec: SipCodec;
  readonly did_number: string;
  readonly config: Record<string, unknown>;
  readonly is_active: boolean;
  readonly updated_at: string | null;
}

export interface VoiceConfigResponse {
  readonly data: VoiceConfigWire;
}

// Flat per FE VoiceTestResponse { success, message, latency_ms? }. `note` kept
// for FE back-compat (its shim maps note→message) alongside the flat `message`.
export interface VoiceTestResultWire {
  readonly success: boolean;
  readonly message: string;
  readonly note: string;
  readonly latency_ms?: number;
}

export interface VoiceTestResponse {
  readonly data: VoiceTestResultWire;
}
