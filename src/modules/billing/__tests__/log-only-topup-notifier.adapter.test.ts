import { describe, expect, it, jest } from '@jest/globals';

import type { Logger } from '@core/logger/logger.js';

import { LogOnlyTopupNotifierAdapter } from '../adapters/log-only-topup-notifier.adapter.js';

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

describe('LogOnlyTopupNotifierAdapter', () => {
  it('should emit structured payload with required keys', async () => {
    const { logger, info } = fakeLogger();
    const adapter = new LogOnlyTopupNotifierAdapter(logger);
    await adapter.notify({
      requestId: 'req-1',
      hotelId: 'hotel-1',
      userId: 'user-1',
      topupPackage: 'M',
      messages: 7000,
      requestedAt: new Date('2026-07-03T00:00:00.000Z'),
    });
    expect(info).toHaveBeenCalledTimes(1);
    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      module: 'billing',
      event: 'topup_notifier_stub',
      requestId: 'req-1',
      hotelId: 'hotel-1',
      userId: 'user-1',
      topupPackage: 'M',
      messages: 7000,
      requestedAt: '2026-07-03T00:00:00.000Z',
    });
  });

  it('should include correlationId when passed', async () => {
    const { logger, info } = fakeLogger();
    const adapter = new LogOnlyTopupNotifierAdapter(logger);
    await adapter.notify({
      requestId: 'r',
      hotelId: 'h',
      userId: 'u',
      topupPackage: 'S',
      messages: 3000,
      requestedAt: new Date(),
      correlationId: 'cid-1',
    });
    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.correlationId).toBe('cid-1');
  });

  it('should return the same requestId and a fresh notifiedAt Date', async () => {
    const { logger } = fakeLogger();
    const adapter = new LogOnlyTopupNotifierAdapter(logger);
    const before = Date.now();
    const result = await adapter.notify({
      requestId: 'echo-me',
      hotelId: 'h',
      userId: 'u',
      topupPackage: 'L',
      messages: 14000,
      requestedAt: new Date(),
    });
    expect(result.requestId).toBe('echo-me');
    expect(result.notifiedAt).toBeInstanceOf(Date);
    expect(result.notifiedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
