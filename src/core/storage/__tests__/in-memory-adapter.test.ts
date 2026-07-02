import { describe, expect, it } from '@jest/globals';

import { InMemoryAdapter } from '../in-memory-adapter.js';

describe('InMemoryAdapter', () => {
  it('should upload and return a memory:// URL plus the key', async () => {
    const adapter = new InMemoryAdapter();
    const body = Buffer.from('hello');

    const result = await adapter.upload({ key: 'menu/img-1.jpg', body });

    expect(result).toEqual({ url: 'memory://menu/img-1.jpg', key: 'menu/img-1.jpg' });
  });

  it('should propagate contentType to the stored object when provided', async () => {
    const adapter = new InMemoryAdapter();
    const body = Buffer.from('binary');

    await adapter.upload({ key: 'kb/a.pdf', body, contentType: 'application/pdf' });

    const stored = adapter.peek('kb/a.pdf');
    expect(stored).toBeDefined();
    expect(stored?.body).toEqual(body);
    expect(stored?.contentType).toBe('application/pdf');
  });

  it('should return undefined from peek for an unknown key', () => {
    const adapter = new InMemoryAdapter();

    expect(adapter.peek('never-uploaded')).toBeUndefined();
  });

  it('should delete an uploaded key so subsequent peek returns undefined', async () => {
    const adapter = new InMemoryAdapter();
    const body = Buffer.from('to-delete');
    await adapter.upload({ key: 'menu/img-2.jpg', body });
    expect(adapter.peek('menu/img-2.jpg')).toBeDefined();

    await adapter.delete('menu/img-2.jpg');

    expect(adapter.peek('menu/img-2.jpg')).toBeUndefined();
  });

  it('should not throw when deleting a missing key (idempotent, matches S3 semantics)', async () => {
    const adapter = new InMemoryAdapter();

    await expect(adapter.delete('never-existed')).resolves.toBeUndefined();
  });
});
