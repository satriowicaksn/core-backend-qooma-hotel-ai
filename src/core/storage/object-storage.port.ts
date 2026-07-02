/**
 * Object storage port — hexagonal seam for external blob storage.
 *
 * Per ADR-0001 (Hexagonal Disiplin) + CLAUDE.md §4: external object storage
 * WAJIB be behind a port. Adapters (S3Adapter for production S3/R2/MinIO,
 * InMemoryAdapter for tests + local dev) implement this shape.
 *
 * Slice-1 surface: `upload` + `delete` only. Signed URL generation
 * (`getSignedUrl`) is deferred to slice-2 (public bucket assumption per
 * `docs/spec/02-hotel-core.md §2.6` menu images + `§7 line 317` daily
 * brief PDF server-fetched, both guest-visible / public-safe).
 *
 * Consumer wiring (future Satrio T22/T24):
 *   const storage: ObjectStoragePort = new S3Adapter({ ... });
 *   await storage.upload({ key: 'menu/123.jpg', body, contentType: 'image/jpeg' });
 */

export interface ObjectStorageUploadInput {
  key: string;
  body: Buffer;
  contentType?: string;
}

export interface ObjectStorageUploadResult {
  url: string;
  key: string;
}

export interface ObjectStoragePort {
  upload(input: ObjectStorageUploadInput): Promise<ObjectStorageUploadResult>;
  delete(key: string): Promise<void>;
}
