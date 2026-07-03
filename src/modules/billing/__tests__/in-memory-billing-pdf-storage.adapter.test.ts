import { describe, expect, it } from '@jest/globals';

import { InMemoryBillingPdfStorageAdapter } from '../adapters/in-memory-billing-pdf-storage.adapter.js';

describe('InMemoryBillingPdfStorageAdapter', () => {
  it('should return null for a missing key', async () => {
    const adapter = new InMemoryBillingPdfStorageAdapter();
    expect(await adapter.download('missing')).toBeNull();
  });

  it('should round-trip a Buffer via put + download', async () => {
    const adapter = new InMemoryBillingPdfStorageAdapter();
    const body = Buffer.from('pdf-bytes');
    adapter.put('invoice/1.pdf', body);
    const got = await adapter.download('invoice/1.pdf');
    expect(got).not.toBeNull();
    expect(got?.equals(body)).toBe(true);
  });

  it('should expose stored keys via keys()', () => {
    const adapter = new InMemoryBillingPdfStorageAdapter();
    adapter.put('a', Buffer.from('a'));
    adapter.put('b', Buffer.from('b'));
    expect(adapter.keys().slice().sort()).toEqual(['a', 'b']);
  });
});
