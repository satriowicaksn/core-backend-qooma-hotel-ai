// Outbound Integration relay port for tier-upgrade requests.
// CLAUDE.md §4 WAJIB port for outbound RPC. Slice-1 impl: log-only stub.
// Slice-2 (or foundation): HTTP adapter posting to Integration service or
// a support/queue system, mirror T25's `IntegrationRelayPort` HTTP path.

import type { UpgradeTargetTier } from '../billing.types.js';

export interface UpgradeNotifyInput {
  readonly requestId: string;
  readonly hotelId: string;
  readonly userId: string;
  readonly targetTier: UpgradeTargetTier;
  readonly requestedAt: Date;
  readonly correlationId?: string;
}

export interface UpgradeNotifyResult {
  readonly requestId: string;
  readonly notifiedAt: Date;
}

export interface UpgradeNotifierPort {
  notify(input: UpgradeNotifyInput): Promise<UpgradeNotifyResult>;
}
