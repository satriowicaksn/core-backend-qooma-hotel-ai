// Serializer: synthesizes the wire for each of the 14 known flags by
// left-joining the KNOWN_FLAGS list with DB rows. PM ACK tightenings #2/#3/#4:
// three-state wire — is_tier_locked / depends_on_active_data / min_tier all
// `null` slice-1 (data unavailable under Opsi C + no campaigns model).

import { FLAG_MIN_TIER, KNOWN_FLAGS, type KnownFlag } from './feature-flags.constants.js';
import type { FeatureFlagRow, FeatureFlagWire } from './feature-flags.types.js';

function narrowConfig(row: FeatureFlagRow): Record<string, unknown> {
  if (typeof row.config === 'object' && row.config !== null && !Array.isArray(row.config)) {
    return row.config as Record<string, unknown>;
  }
  return {};
}

export function serializeFlagRow(row: FeatureFlagRow, flag: KnownFlag): FeatureFlagWire {
  return {
    hotel_id: row.hotelId,
    flag,
    is_enabled: row.isEnabled,
    config: narrowConfig(row),
    min_tier: FLAG_MIN_TIER[flag],
    is_tier_locked: null,
    depends_on_active_data: null,
    updated_at: row.updatedAt.toISOString(),
    updated_by: row.updatedBy,
  };
}

// Default wire when no DB row exists yet. `is_enabled: false` per MVP §101
// seed guidance ("seed default flags off for each existing hotel").
export function emptyFlagWire(hotelId: string, flag: KnownFlag): FeatureFlagWire {
  return {
    hotel_id: hotelId,
    flag,
    is_enabled: false,
    config: {},
    min_tier: FLAG_MIN_TIER[flag],
    is_tier_locked: null,
    depends_on_active_data: null,
    updated_at: null,
    updated_by: null,
  };
}

// Compose the wire list — 14 known flags left-joined with DB rows.
export function composeFlagList(
  hotelId: string,
  rows: readonly FeatureFlagRow[],
): FeatureFlagWire[] {
  const byFlag = new Map<string, FeatureFlagRow>();
  for (const row of rows) {
    byFlag.set(row.flag, row);
  }
  return KNOWN_FLAGS.map((flag) => {
    const row = byFlag.get(flag);
    return row ? serializeFlagRow(row, flag) : emptyFlagWire(hotelId, flag);
  });
}
