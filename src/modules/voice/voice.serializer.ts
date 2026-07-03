// Serializer: Prisma row (camelCase) → wire DTO (snake_case). One-way, at the
// route boundary only. Empty-default helper covers the no-row branch of GET.

import type { VoiceConfigRow, VoiceConfigWire } from './voice.types.js';

export function serializeVoiceConfig(row: VoiceConfigRow): VoiceConfigWire {
  const config =
    typeof row.config === 'object' && row.config !== null && !Array.isArray(row.config)
      ? (row.config as Record<string, unknown>)
      : {};
  return {
    hotel_id: row.hotelId,
    pbx_type: row.pbxType,
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
    config: {},
    is_active: false,
    updated_at: null,
  };
}
