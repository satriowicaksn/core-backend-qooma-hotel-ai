// Outbound Integration relay port for prepaid outbound top-up requests.
// CLAUDE.md §4 WAJIB port for outbound RPC. Slice-1 impl: log-only stub.
// Slice-2 (or foundation): HTTP adapter posting to Integration service or a
// support/queue system, mirror T25's `IntegrationRelayPort` HTTP path.

import type { TopupPackage } from '../billing.types.js';

export interface TopupNotifyInput {
  readonly requestId: string;
  readonly hotelId: string;
  readonly userId: string;
  readonly topupPackage: TopupPackage;
  readonly messages: number;
  readonly requestedAt: Date;
  readonly correlationId?: string;
}

export interface TopupNotifyResult {
  readonly requestId: string;
  readonly notifiedAt: Date;
}

export interface TopupNotifierPort {
  notify(input: TopupNotifyInput): Promise<TopupNotifyResult>;
}
