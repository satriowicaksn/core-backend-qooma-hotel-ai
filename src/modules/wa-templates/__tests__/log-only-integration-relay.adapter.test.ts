import { describe, expect, it, jest } from '@jest/globals';

import type { Logger } from '@core/logger/logger.js';

import { LogOnlyIntegrationRelayAdapter } from '../adapters/log-only-integration-relay.adapter.js';

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

describe('LogOnlyIntegrationRelayAdapter', () => {
  it('should log the exact tightening #3 payload keys', async () => {
    const { logger, info } = fakeLogger();
    const adapter = new LogOnlyIntegrationRelayAdapter(logger);
    await adapter.relaySubmit({
      intent: 'create',
      templateId: 'tpl-1',
      hotelId: 'hotel-1',
      name: 'welcome_local',
      body: 'body {{v}}',
      language: 'id',
      variables: ['v'],
    });
    expect(info).toHaveBeenCalledTimes(1);
    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      module: 'wa-templates',
      event: 'integration_relay_stub',
      intent: 'create',
      templateId: 'tpl-1',
      hotelId: 'hotel-1',
      name: 'welcome_local',
      language: 'id',
    });
    // messageId is generated per call — must be present as a string.
    expect(typeof payload.messageId).toBe('string');
  });

  it('should include correlationId when passed', async () => {
    const { logger, info } = fakeLogger();
    const adapter = new LogOnlyIntegrationRelayAdapter(logger);
    await adapter.relaySubmit({
      intent: 'resubmit',
      templateId: 't',
      hotelId: 'h',
      name: 'n',
      body: 'b',
      language: 'id',
      variables: [],
      correlationId: 'cid-1',
    });
    const payload = info.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload.correlationId).toBe('cid-1');
  });

  it('should return {messageId, relayedAt} with a Date + non-empty string', async () => {
    const { logger } = fakeLogger();
    const adapter = new LogOnlyIntegrationRelayAdapter(logger);
    const before = Date.now();
    const result = await adapter.relaySubmit({
      intent: 'create',
      templateId: 't',
      hotelId: 'h',
      name: 'n',
      body: 'b',
      language: 'id',
      variables: [],
    });
    expect(typeof result.messageId).toBe('string');
    expect(result.messageId.length).toBeGreaterThan(0);
    expect(result.relayedAt).toBeInstanceOf(Date);
    expect(result.relayedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('should differentiate intent on the log line (create vs resubmit)', async () => {
    const { logger, info } = fakeLogger();
    const adapter = new LogOnlyIntegrationRelayAdapter(logger);
    const base = {
      templateId: 't',
      hotelId: 'h',
      name: 'n',
      body: 'b',
      language: 'id',
      variables: [],
    };
    await adapter.relaySubmit({ ...base, intent: 'create' });
    await adapter.relaySubmit({ ...base, intent: 'resubmit' });
    expect(info).toHaveBeenCalledTimes(2);
    expect((info.mock.calls[0]?.[0] as { intent: string }).intent).toBe('create');
    expect((info.mock.calls[1]?.[0] as { intent: string }).intent).toBe('resubmit');
  });
});
