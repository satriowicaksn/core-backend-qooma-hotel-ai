// Log-only top-up notifier adapter — MVP stub per T25 relay pattern.
// Emits a structured log line then returns a synthetic `requestId` echo +
// `notifiedAt`. Slice-2 will replace with an HTTP adapter POSTing to
// Integration / support.

import type { Logger } from '@core/logger/logger.js';

import type {
  TopupNotifierPort,
  TopupNotifyInput,
  TopupNotifyResult,
} from '../ports/topup-notifier.port.js';

export class LogOnlyTopupNotifierAdapter implements TopupNotifierPort {
  constructor(private readonly logger: Logger) {}

  notify(input: TopupNotifyInput): Promise<TopupNotifyResult> {
    const notifiedAt = new Date();
    this.logger.info({
      module: 'billing',
      event: 'topup_notifier_stub',
      requestId: input.requestId,
      hotelId: input.hotelId,
      userId: input.userId,
      topupPackage: input.topupPackage,
      messages: input.messages,
      requestedAt: input.requestedAt.toISOString(),
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
    });
    return Promise.resolve({ requestId: input.requestId, notifiedAt });
  }
}
