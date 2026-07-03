// Domain + wire (snake_case) types for the feature-flags surface.
// PM ACK tightenings #2/#3/#4 — three-state wire fields:
//   is_tier_locked, depends_on_active_data, min_tier are all `... | null`.
//   `null` = data unavailable (Opsi C slice-1); real value comes post-Opsi-A.

import type { Prisma } from '@prisma/client';

import type { TierName } from '../billing/index.js';

import type { KnownFlag } from './feature-flags.constants.js';

export type FeatureFlagRow = Prisma.FeatureFlagGetPayload<Record<string, never>>;

export interface FeatureFlagWire {
  readonly hotel_id: string;
  readonly flag: KnownFlag;
  readonly is_enabled: boolean;
  readonly config: Record<string, unknown>;
  // Three-state per PM ACK tightenings #2/#3/#4.
  readonly min_tier: TierName | null;
  readonly is_tier_locked: boolean | null;
  readonly depends_on_active_data: boolean | null;
  readonly updated_at: string | null;
  readonly updated_by: string | null;
}

export interface FeatureFlagListResponse {
  readonly data: readonly FeatureFlagWire[];
}

export interface FeatureFlagResponse {
  readonly data: FeatureFlagWire;
}
