// Outbound Integration relay port — CLAUDE.md §4 WAJIB port for outbound RPC.
// Slice-1 impl: log-only stub (per MVP §W2/W4/W5). Slice-2 impl: HTTP adapter
// posting to Integration service with HMAC (INTEGRATION_SHARED_SECRET).
//
// Single method with discriminated `intent` per Q-T25-#4 lean — smaller port
// surface; slice-2 HTTP adapter easier to wire.

export interface IntegrationRelaySubmitInput {
  readonly intent: 'create' | 'resubmit';
  readonly templateId: string;
  readonly hotelId: string;
  readonly name: string;
  readonly body: string;
  readonly language: string;
  readonly variables: readonly string[];
  readonly correlationId?: string;
}

export interface IntegrationRelayResult {
  readonly messageId: string;
  readonly relayedAt: Date;
}

export interface IntegrationRelayPort {
  relaySubmit(input: IntegrationRelaySubmitInput): Promise<IntegrationRelayResult>;
}
