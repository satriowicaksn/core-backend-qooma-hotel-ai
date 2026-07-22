/**
 * Validated environment loader via zod.
 * Single source of truth untuk semua config runtime.
 *
 * Usage:
 *   import { loadConfig } from '@core/config/env.js';
 *   const config = loadConfig(); // throws kalau invalid
 *
 * Tambah field service-specific di bawah section "Service-specific".
 */

import { z } from 'zod';

const EnvSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TZ: z.string().default('UTC'),

  // HTTP Server
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_HOST: z.string().default('0.0.0.0'),
  API_BASE_URL: z.string().url(),
  CORS_ORIGIN: z.string(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),
  REDIS_QUEUE_DB: z.coerce.number().int().nonnegative().default(0),
  REDIS_CACHE_DB: z.coerce.number().int().nonnegative().default(1),
  // z.coerce.boolean() misparses string "false" as true (Boolean("false")===true).
  // Use preprocess to handle the "false"/"true" string env var values correctly.
  REDIS_TLS_ENABLED: z
    .preprocess((v) => v === true || v === 'true' || v === '1', z.boolean())
    .default(false),

  // Security
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('8h'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_TTL: z.string().default('30d'),
  ENCRYPTION_KEY: z.string().length(64),
  ENCRYPTION_KEY_VERSION: z.string().default('v1'),

  // Rate limit
  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WEBHOOK_PER_MIN: z.coerce.number().int().positive().default(300),

  // Observability
  SENTRY_DSN: z.string().optional().default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_ENV: z.string().default('development'),

  // Worker
  WORKER_CONCURRENCY_DEFAULT: z.coerce.number().int().positive().default(5),

  // ====================================================================
  // Service-specific (tambah field service di sini, contoh):
  // ====================================================================
  // ANTHROPIC_API_KEY: z.string().min(1),
  // UPSTREAM_API_BASE: z.string().url(),

  // Object storage (T08 — fail-lazy per S3Adapter design; all optional so
  // app boots without S3 creds. Consumer adapter throws ExternalServiceError
  // at first upload/delete if the required subset is missing.)
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),

  // Internal RPC shared secret (ADD-24 — integration-backend → this service).
  // Optional so api boots without it; internal routes answer 401 until set.
  INTERNAL_API_SECRET: z.string().min(32).optional(),

  // Cross-DB check gate (T21 Q-C-02 — Opsi C dev-DB deviation, PARENT §4).
  // When true, features skip queries that need cross-service tables (e.g.
  // `users.department_id` for departments delete-conflict), because those
  // tables live in Auth DB not `hotel_core_dev`. Default true (safe-in-DEV).
  // Set false only after PARENT §4 Opsi A / multi-schema restoration lands.
  // Prod-with-flag-true = observability warning (see departments.service).
  SKIP_CROSS_DB_CHECKS: z
    .preprocess((v) => v === true || v === 'true' || v === '1', z.boolean())
    .default(true),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

/** Untuk test — reset cache supaya re-validate */
export function resetConfigCache(): void {
  cached = null;
}
