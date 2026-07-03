// In-memory billing PDF storage adapter — Q-T27-#7 slice-1.
// Map-backed impl for tests + composition-root seam. Production wiring will
// either build a small AWS SDK GetObjectCommand adapter or (preferred) swap
// to the foundation `ObjectStoragePort` once Slot A extends it with
// `download`.

import type { BillingPdfStoragePort } from '../ports/billing-pdf-storage.port.js';

export class InMemoryBillingPdfStorageAdapter implements BillingPdfStoragePort {
  private readonly store = new Map<string, Buffer>();

  // Test-only accessor: seed a key/value pair before invoking the port.
  put(key: string, body: Buffer): void {
    this.store.set(key, body);
  }

  // Test-only accessor: observe stored keys.
  keys(): readonly string[] {
    return Array.from(this.store.keys());
  }

  download(key: string): Promise<Buffer | null> {
    const found = this.store.get(key);
    return Promise.resolve(found ?? null);
  }
}
