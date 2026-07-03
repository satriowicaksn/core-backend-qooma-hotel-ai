// Log-only upgrade notifier adapter — MVP stub per T25 relay pattern.
// Emits a structured log line then returns a synthetic `requestId` echo +
// `notifiedAt`. Slice-2 will replace with an HTTP adapter POSTing to
// Integration / support.

import type { Logger } from '@core/logger/logger.js';

import type {
  UpgradeNotifierPort,
  UpgradeNotifyInput,
  UpgradeNotifyResult,
} from '../ports/upgrade-notifier.port.js';

export class LogOnlyUpgradeNotifierAdapter implements UpgradeNotifierPort {
  constructor(private readonly logger: Logger) {}

  notify(input: UpgradeNotifyInput): Promise<UpgradeNotifyResult> {
    const notifiedAt = new Date();
    this.logger.info({
      module: 'billing',
      event: 'upgrade_notifier_stub',
      requestId: input.requestId,
      hotelId: input.hotelId,
      userId: input.userId,
      targetTier: input.targetTier,
      requestedAt: input.requestedAt.toISOString(),
      ...(input.correlationId !== undefined ? { correlationId: input.correlationId } : {}),
    });
    return Promise.resolve({ requestId: input.requestId, notifiedAt });
  }
}
