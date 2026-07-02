/**
 * InMemoryAdapter — Map-based object storage for tests + local dev.
 *
 * Consumers (Satrio T22 menu image, T24 KB attachment) inject this via the
 * `ObjectStoragePort` interface in unit tests to avoid stubbing the AWS SDK.
 * Local dev without S3 credentials can also use this via manual wiring.
 *
 * URL scheme: `memory://<key>` — a synthetic prefix that consumer code can
 * treat as opaque (never fetched over the network).
 *
 * Idempotency: `delete` on a missing key is a no-op (matches S3
 * `DeleteObjectCommand` semantics — 204 No Content on non-existent).
 *
 * Test observability: the `peek(key)` accessor is exposed on the class
 * (NOT the port) so tests can verify body + contentType propagation
 * without going through the port surface.
 */

import type {
  ObjectStoragePort,
  ObjectStorageUploadInput,
  ObjectStorageUploadResult,
} from './object-storage.port.js';

interface InMemoryStoredObject {
  body: Buffer;
  contentType: string | undefined;
}

export class InMemoryAdapter implements ObjectStoragePort {
  private readonly storage = new Map<string, InMemoryStoredObject>();

  upload(input: ObjectStorageUploadInput): Promise<ObjectStorageUploadResult> {
    this.storage.set(input.key, {
      body: input.body,
      contentType: input.contentType,
    });
    return Promise.resolve({ url: `memory://${input.key}`, key: input.key });
  }

  delete(key: string): Promise<void> {
    this.storage.delete(key);
    return Promise.resolve();
  }

  /** Test-only accessor — inspects stored body + contentType. Not on the port. */
  peek(key: string): InMemoryStoredObject | undefined {
    return this.storage.get(key);
  }
}
