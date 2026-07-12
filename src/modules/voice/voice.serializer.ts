// Serializer: Prisma row (camelCase) → wire DTO (snake_case). One-way, at the
// route boundary only. Empty-default helper covers the no-row branch of GET.
//
// SIP detail fields live inside the opaque `config` JSON (the Prisma model has
// no dedicated columns). They are read back out and surfaced FLAT to match the
// FE VoiceSettings contract, with safe defaults for the empty/partial row.

import type { SipCodec, VoiceConfigRow, VoiceConfigWire } from './voice.types.js';

function asConfig(raw: unknown): Record<string, unknown> {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function readString(config: Record<string, unknown>, key: string): string {
  const v = config[key];
  return typeof v === 'string' ? v : '';
}

function readSipPort(config: Record<string, unknown>): number {
  const v = config['sip_port'];
  return typeof v === 'number' ? v : 0;
}

function readSipCodec(config: Record<string, unknown>): SipCodec {
  const v = config['sip_codec'];
  return v === 'g711a' || v === 'g711u' || v === 'opus' ? v : 'g711a';
}

export function serializeVoiceConfig(row: VoiceConfigRow): VoiceConfigWire {
  const config = asConfig(row.config);
  return {
    hotel_id: row.hotelId,
    pbx_type: row.pbxType,
    pbx_host: readString(config, 'pbx_host'),
    sip_username: readString(config, 'sip_username'),
    sip_password: readString(config, 'sip_password'),
    sip_port: readSipPort(config),
    sip_codec: readSipCodec(config),
    did_number: readString(config, 'did_number'),
    config,
    is_active: row.isActive,
    updated_at: row.updatedAt.toISOString(),
  };
}

// GET fallback when no row exists — never 404 per MVP §101 groundwork guidance.
// hotel_id carries the caller's tenant scope so FE knows which hotel it read.
export function emptyVoiceConfig(hotelId: string): VoiceConfigWire {
  return {
    hotel_id: hotelId,
    pbx_type: null,
    pbx_host: '',
    sip_username: '',
    sip_password: '',
    sip_port: 0,
    sip_codec: 'g711a',
    did_number: '',
    config: {},
    is_active: false,
    updated_at: null,
  };
}
