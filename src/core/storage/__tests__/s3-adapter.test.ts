import { describe, expect, it } from '@jest/globals';

import { ExternalServiceError } from '@core/errors/app-errors.js';

import { S3Adapter } from '../s3-adapter.js';

/**
 * Slice-1 scope: fail-lazy config-check paths only. SDK happy-path behavior
 * is not mocked here — hexagonal principle says consumers use InMemoryAdapter
 * via port injection in tests, and real S3 behavior is verified downstream by
 * consumer integration tests (Satrio T22/T24) once he onboards.
 */
describe('S3Adapter (fail-lazy config)', () => {
  it('should throw ExternalServiceError on upload when config is missing', async () => {
    const adapter = new S3Adapter({});

    let caught: unknown;
    try {
      await adapter.upload({ key: 'k', body: Buffer.from('x') });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ExternalServiceError);
    const err = caught as ExternalServiceError;
    expect(err.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(err.statusCode).toBe(502);
    expect(err.message).toContain('S3');
    expect(err.message).toContain('not configured');
  });

  it('should throw ExternalServiceError on delete when config is missing', async () => {
    const adapter = new S3Adapter({ bucket: 'only-bucket-set' });

    let caught: unknown;
    try {
      await adapter.delete('k');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(ExternalServiceError);
    const err = caught as ExternalServiceError;
    expect(err.message).toContain('not configured');
  });
});
