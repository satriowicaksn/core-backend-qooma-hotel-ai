// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Crux (T29): PK-per-hotel upsert idempotency + tenant isolation via PK +
// permissive pbx_type (no CHECK constraint).

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { BusinessRuleError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { buildVoiceService } from '../index.js';
import type { VoiceService } from '../voice.service.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_A = '1111aaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = '2222bbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const gmA: TenantContext = {
  userId: USER_A,
  hotelId: HOTEL_A,
  isSuperAdmin: false,
  role: 'gm_admin',
};
const gmB: TenantContext = {
  userId: USER_B,
  hotelId: HOTEL_B,
  isSuperAdmin: false,
  role: 'gm_admin',
};

let container: StartedPostgreSqlContainer;
let db: PrismaClient;
let service: VoiceService;

async function seedHotels(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  const url = container.getConnectionUri();
  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
  db = new PrismaClient({ datasources: { db: { url } } });
  service = buildVoiceService(db);
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.voiceConfig.deleteMany();
  await db.hotel.deleteMany();
  await seedHotels();
});

describe('VoiceService groundwork (integration)', () => {
  describe('GET empty-default fallback', () => {
    it('should return empty default when no row exists (never 404)', async () => {
      const res = await service.get(gmA);
      expect(res.data).toEqual({
        hotel_id: HOTEL_A,
        pbx_type: null,
        config: {},
        is_active: false,
        updated_at: null,
      });
    });
  });

  describe('PUT upsert semantics', () => {
    it('should create a row on first PUT and reflect the state on GET', async () => {
      await service.upsert(gmA, { pbx_type: 'sip', is_active: true });
      const res = await service.get(gmA);
      expect(res.data.pbx_type).toBe('sip');
      expect(res.data.is_active).toBe(true);
      expect(res.data.updated_at).not.toBeNull();
    });

    it('should update fields on subsequent PUT (partial-update)', async () => {
      await service.upsert(gmA, { pbx_type: 'sip', is_active: true });
      await service.upsert(gmA, { config: { host: 'sip.example.com' } });
      const res = await service.get(gmA);
      // pbx_type + is_active from first PUT are preserved.
      expect(res.data.pbx_type).toBe('sip');
      expect(res.data.is_active).toBe(true);
      expect(res.data.config).toEqual({ host: 'sip.example.com' });
    });

    it('should be idempotent — same input twice converges to same state', async () => {
      const first = await service.upsert(gmA, { pbx_type: 'twilio', is_active: true });
      const second = await service.upsert(gmA, { pbx_type: 'twilio', is_active: true });
      expect(second.data.pbx_type).toBe(first.data.pbx_type);
      expect(second.data.is_active).toBe(first.data.is_active);
    });

    it('should support clearing pbx_type to null via PUT', async () => {
      await service.upsert(gmA, { pbx_type: 'sip' });
      await service.upsert(gmA, { pbx_type: null });
      const res = await service.get(gmA);
      expect(res.data.pbx_type).toBeNull();
    });

    it('should accept permissive pbx_type strings (Q-T29-#2)', async () => {
      const values = ['sip', 'twilio', 'custom_pbx_v2', 'genesys-cloud'];
      for (const v of values) {
        await service.upsert(gmA, { pbx_type: v });
        const res = await service.get(gmA);
        expect(res.data.pbx_type).toBe(v);
      }
    });
  });

  describe('tenant isolation via PK-per-hotel', () => {
    it('should keep HOTEL_A and HOTEL_B state independent', async () => {
      await service.upsert(gmA, { pbx_type: 'sip', is_active: true });
      await service.upsert(gmB, { pbx_type: 'twilio' });

      const resA = await service.get(gmA);
      const resB = await service.get(gmB);
      expect(resA.data.pbx_type).toBe('sip');
      expect(resA.data.is_active).toBe(true);
      expect(resB.data.pbx_type).toBe('twilio');
      expect(resB.data.is_active).toBe(false);
    });

    it('should return empty default for HOTEL_B when only HOTEL_A has state', async () => {
      await service.upsert(gmA, { pbx_type: 'sip' });
      const resB = await service.get(gmB);
      expect(resB.data.pbx_type).toBeNull();
      expect(resB.data.hotel_id).toBe(HOTEL_B);
    });
  });

  describe('POST /test precondition guard', () => {
    it('should 422 VOICE_NOT_CONFIGURED when no row exists', async () => {
      await expect(service.test(gmA)).rejects.toBeInstanceOf(BusinessRuleError);
    });

    it('should 422 VOICE_NOT_CONFIGURED when row exists but pbx_type is null', async () => {
      await service.upsert(gmA, { is_active: true }); // pbx_type stays null
      await expect(service.test(gmA)).rejects.toBeInstanceOf(BusinessRuleError);
    });

    it('should return stub success when pbx_type is set', async () => {
      await service.upsert(gmA, { pbx_type: 'sip' });
      const res = await service.test(gmA);
      expect(res.data.success).toBe(true);
      expect(res.data.note).toContain('wave 2a');
    });
  });
});
