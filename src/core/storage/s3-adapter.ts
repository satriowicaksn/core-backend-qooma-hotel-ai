/**
 * S3Adapter — real object-storage adapter for AWS S3 / Cloudflare R2 / MinIO.
 *
 * All three are S3-API-compatible; swap by setting `S3_ENDPOINT`:
 *   - AWS S3 (default): leave `endpoint` unset; virtual-hosted URL scheme.
 *   - Cloudflare R2: set `endpoint` to your R2 endpoint URL (e.g.
 *     `https://<account>.r2.cloudflarestorage.com`); adapter enables
 *     `forcePathStyle` automatically because R2 doesn't do virtual hosting.
 *   - MinIO / self-hosted: same as R2 — set `endpoint`, forcePathStyle on.
 *
 * Fail-lazy env pattern: config is passed at construction with all fields
 * optional. First `upload` / `delete` call validates the required subset
 * (`bucket` + `region` + `accessKeyId` + `secretAccessKey`) and throws
 * `ExternalServiceError('S3', 'not configured …')` if any are missing.
 * Rationale: app should boot without S3 creds for dev / test / seed
 * workflows that don't touch storage.
 *
 * SDK error wrap: any `S3Client.send` failure is caught + re-thrown as
 * `ExternalServiceError('S3', <sdk-message>, { body: <sdk-err> })`. Full
 * SDK error object propagates via `upstream.body` so Sentry retains
 * `$metadata` (httpStatusCode, requestId) for debugging.
 *
 * Slice-1 surface: `upload` + `delete`. Signed URL generation deferred
 * to slice-2 — needs `@aws-sdk/s3-request-presigner`. Not required for
 * menu images or daily-brief PDFs per spec §2.6 / §7 line 317.
 */

import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { ExternalServiceError } from '@core/errors/app-errors.js';

import type {
  ObjectStoragePort,
  ObjectStorageUploadInput,
  ObjectStorageUploadResult,
} from './object-storage.port.js';

export interface S3AdapterConfig {
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

interface RequiredS3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3Adapter implements ObjectStoragePort {
  private client: S3Client | null = null;

  constructor(private readonly config: S3AdapterConfig) {}

  async upload(input: ObjectStorageUploadInput): Promise<ObjectStorageUploadResult> {
    const required = this.requireConfig();
    const client = this.ensureClient(required);
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: required.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
        }),
      );
    } catch (err) {
      throw this.wrap(err);
    }
    return { url: this.buildUrl(required, input.key), key: input.key };
  }

  async delete(key: string): Promise<void> {
    const required = this.requireConfig();
    const client = this.ensureClient(required);
    try {
      await client.send(new DeleteObjectCommand({ Bucket: required.bucket, Key: key }));
    } catch (err) {
      throw this.wrap(err);
    }
  }

  private requireConfig(): RequiredS3Config {
    const { bucket, region, accessKeyId, secretAccessKey } = this.config;
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new ExternalServiceError(
        'S3',
        'not configured — set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY',
      );
    }
    return { bucket, region, accessKeyId, secretAccessKey };
  }

  private ensureClient(required: RequiredS3Config): S3Client {
    if (this.client) return this.client;
    this.client = new S3Client({
      region: required.region,
      credentials: {
        accessKeyId: required.accessKeyId,
        secretAccessKey: required.secretAccessKey,
      },
      ...(this.config.endpoint !== undefined && {
        endpoint: this.config.endpoint,
        forcePathStyle: true,
      }),
    });
    return this.client;
  }

  private buildUrl(required: RequiredS3Config, key: string): string {
    if (this.config.endpoint) {
      return `${this.config.endpoint}/${required.bucket}/${key}`;
    }
    return `https://${required.bucket}.s3.${required.region}.amazonaws.com/${key}`;
  }

  private wrap(err: unknown): ExternalServiceError {
    const message = err instanceof Error ? err.message : 'unknown S3 error';
    return new ExternalServiceError('S3', message, { body: err });
  }
}
