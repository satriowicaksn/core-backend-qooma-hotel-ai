import { describe, expect, it, jest } from '@jest/globals';

import type { Logger } from '@core/logger/logger.js';

import { LogOnlyUpgradeNotifierAdapter } from '../adapters/log-only-upgrade-notifier.adapter.js';

function fakeLogger(): { logger: Logger; info: jest.Mock } {
  const info = jest.fn();
  const logger: Logger = {
    debug: jest.fn(),
    info,
    warn: jest.fn(),
    error: jest.fn(),
  };
  return { logger, info };
}

describe('LogOnlyUpgradeNotifierAdapter', () => {
  it('should emit structured payload with required keys', async () => {
    const { logger, info } = fakeLogger();
    const adapter = new LogOnlyUpgradeNotifierAdapter(logger);
    await adapter.notify({
      requestId: 'req-1',
      hotelId: 'hotel-1',
      userId: 'user-1',
      targetTier: 'luxury',
      requestedAt: new Date('2026-07-03T00:00:00.000Z'),
    });
    expect(info).toHaveBeenCalledTimes(1);
    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      module: 'billing',
      event: 'upgrade_notifier_stub',
      requestId: 'req-1',
      hotelId: 'hotel-1',
      userId: 'user-1',
      targetTier: 'luxury',
      requestedAt: '2026-07-03T00:00:00.000Z',
    });
  });

  it('should include correlationId when passed', async () => {
    const { logger, info } = fakeLogger();
    const adapter = new LogOnlyUpgradeNotifierAdapter(logger);
    await adapter.notify({
      requestId: 'r',
      hotelId: 'h',
      userId: 'u',
      targetTier: 'professional',
      requestedAt: new Date(),
      correlationId: 'cid-1',
    });
    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.correlationId).toBe('cid-1');
  });

  it('should return the same requestId and a fresh notifiedAt Date', async () => {
    const { logger } = fakeLogger();
    const adapter = new LogOnlyUpgradeNotifierAdapter(logger);
    const before = Date.now();
    const result = await adapter.notify({
      requestId: 'echo-me',
      hotelId: 'h',
      userId: 'u',
      targetTier: 'enterprise',
      requestedAt: new Date(),
    });
    expect(result.requestId).toBe('echo-me');
    expect(result.notifiedAt).toBeInstanceOf(Date);
    expect(result.notifiedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
