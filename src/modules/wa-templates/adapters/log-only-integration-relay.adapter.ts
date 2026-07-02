// Log-only Integration relay adapter — MVP stub per MVP §W2/W4/W5 pattern.
// Emits a structured log line then returns a synthetic `messageId`. Slice-2
// will replace with an HTTP adapter POSTing to Integration service.
//
// Adapter is deliberately dumb: no retry/backoff, no persistence — those
// belong in the HTTP adapter with Bull (slice-2).

import { randomUUID } from 'node:crypto';

import type { Logger } from '@core/logger/logger.js';

import type {
  IntegrationRelayPort,
  IntegrationRelayResult,
  IntegrationRelaySubmitInput,
} from '../ports/integration-relay.port.js';

// Tightening #3: exact log payload keys for observability (grep + Loki labels).
export class LogOnlyIntegrationRelayAdapter implements IntegrationRelayPort {
  constructor(private readonly logger: Logger) {}

  relaySubmit(input: IntegrationRelaySubmitInput): Promise<IntegrationRelayResult> {
    const messageId = randomUUID();
    const relayedAt = new Date();

    this.logger.info({
      module: 'wa-templates',
      event: 'integration_relay_stub',
      intent: input.intent,
      templateId: input.templateId,
      hotelId: input.hotelId,
      name: input.name,
      language: input.language,
      messageId,
      // correlationId is best-effort — service may not have route context.
      // Slice-2 HTTP adapter will plumb the x-correlation-id header end-to-end.
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
    });

    return Promise.resolve({ messageId, relayedAt });
  }
}
