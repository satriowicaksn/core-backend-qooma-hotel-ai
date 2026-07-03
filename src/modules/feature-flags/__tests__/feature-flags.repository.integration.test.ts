// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Crux (T26): UNIQUE(hotel_id, flag) + upsert idempotency + tenant isolation.
// **PM ACK tightening #1 proof**: updated_by=null path works without hitting
// the users FK constraint (users table not in hotel_core_dev under Opsi C).

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { FeatureFlagsService } from '../feature-flags.service.js';
import { buildFeatureFlagsService, KNOWN_FLAGS } from '../index.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_A = '1111aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const gmA: TenantContext = {
  userId: USER_A,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const gmB: TenantContext = {
  userId: '2222bbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  hotelId: HOTEL_B,
  isSuperAdmin: false,
  role: 'gm_admin',
};

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: FeatureFlagsService;

function silentLogger(): Logger {
  return { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  const url = container.getConnectionUri();
  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
  db = new PrismaClient({ datasources: { db: { url } } });
  service = buildFeatureFlagsService(db, {
    logger: silentLogger(),
    skipCrossDbChecks: true,
    nodeEnv: 'development',
  });
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.featureFlag.deleteMany();
  await db.hotel.deleteMany();
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });
});

describe('FeatureFlagsService.list (integration)', () => {
  it('should return all 14 KNOWN_FLAG wires even when DB has no rows', async () => {
    const res = await service.list(gmA);
    expect(res.data).toHaveLength(KNOWN_FLAGS.length);
    expect(res.data.every((w) => w.hotel_id === HOTEL_A)).toBe(true);
    // All three-state fields are null (Opsi C).
    expect(res.data.every((w) => w.is_tier_locked === null)).toBe(true);
    expect(res.data.every((w) => w.depends_on_active_data === null)).toBe(true);
    expect(res.data.every((w) => w.min_tier === null)).toBe(true);
    // All defaults: not enabled, no updates yet.
    expect(res.data.every((w) => w.is_enabled === false)).toBe(true);
    expect(res.data.every((w) => w.updated_at === null)).toBe(true);
  });

  it('should reflect a persisted row in the composed list', async () => {
    // Seed via service.patch so the FK-avoidance path is exercised.
    await service.patch(gmA, 'menu_ordering', { is_enabled: true });
    const res = await service.list(gmA);
    const mo = res.data.find((w) => w.flag === 'menu_ordering');
    expect(mo?.is_enabled).toBe(true);
    expect(mo?.updated_at).not.toBeNull();
  });
});

describe('FeatureFlagsService.patch — tightening #1 (updated_by=null under Opsi C)', () => {
  it('should upsert a new row without hitting the users FK', async () => {
    // Under Opsi C, no users seeded in testcontainer. Passing ctx.userId
    // would violate the FK. Service passes null instead.
    await service.patch(gmA, 'multi_language', { is_enabled: true });
    const persisted = await db.featureFlag.findFirst({
      where: { hotelId: HOTEL_A, flag: 'multi_language' },
    });
    expect(persisted?.isEnabled).toBe(true);
    expect(persisted?.updatedBy).toBeNull();
  });

  it('should idempotently upsert on repeated PATCH (UNIQUE(hotel_id, flag))', async () => {
    await service.patch(gmA, 'multi_language', { is_enabled: true });
    await service.patch(gmA, 'multi_language', { is_enabled: false });
    const rows = await db.featureFlag.findMany({
      where: { hotelId: HOTEL_A, flag: 'multi_language' },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.isEnabled).toBe(false);
  });

  it('should persist config as JSONB', async () => {
    await service.patch(gmA, 'sentiment_detection', {
      config: { threshold: 0.75, model: 'v2' },
    });
    const persisted = await db.featureFlag.findFirst({
      where: { hotelId: HOTEL_A, flag: 'sentiment_detection' },
    });
    expect(persisted?.config).toEqual({ threshold: 0.75, model: 'v2' });
  });

  it('should merge is_enabled + config in one call', async () => {
    await service.patch(gmA, 'wa_templates', { is_enabled: true, config: { k: 'v' } });
    const persisted = await db.featureFlag.findFirst({
      where: { hotelId: HOTEL_A, flag: 'wa_templates' },
    });
    expect(persisted?.isEnabled).toBe(true);
    expect(persisted?.config).toEqual({ k: 'v' });
  });

  it('should preserve config when only is_enabled is toggled (partial-update)', async () => {
    await service.patch(gmA, 'butler_anticipate', {
      is_enabled: true,
      config: { autoReply: true },
    });
    await service.patch(gmA, 'butler_anticipate', { is_enabled: false });
    const persisted = await db.featureFlag.findFirst({
      where: { hotelId: HOTEL_A, flag: 'butler_anticipate' },
    });
    expect(persisted?.isEnabled).toBe(false);
    expect(persisted?.config).toEqual({ autoReply: true });
  });
});

describe('FeatureFlagsService — tenant isolation (integration)', () => {
  it('should scope reads to the current hotel', async () => {
    await service.patch(gmA, 'multi_language', { is_enabled: true });
    await service.patch(gmB, 'multi_language', { is_enabled: false });
    const resA = await service.list(gmA);
    const resB = await service.list(gmB);
    const mlA = resA.data.find((w) => w.flag === 'multi_language');
    const mlB = resB.data.find((w) => w.flag === 'multi_language');
    expect(mlA?.is_enabled).toBe(true);
    expect(mlB?.is_enabled).toBe(false);
  });

  it('should allow same flag across hotels (per-hotel UNIQUE)', async () => {
    await service.patch(gmA, 'menu_ordering', { is_enabled: true });
    await service.patch(gmB, 'menu_ordering', { is_enabled: true });
    const countA = await db.featureFlag.count({
      where: { hotelId: HOTEL_A, flag: 'menu_ordering' },
    });
    const countB = await db.featureFlag.count({
      where: { hotelId: HOTEL_B, flag: 'menu_ordering' },
    });
    expect(countA).toBe(1);
    expect(countB).toBe(1);
  });
});
