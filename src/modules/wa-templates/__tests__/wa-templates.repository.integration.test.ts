// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Self-contained: spins its own PG, applies migrations, seeds fixtures. Requires Docker.
// Crux (T25): scope-XOR CHECK, status CHECK, tenant isolation, global visible
// cross-hotel, delete + archive semantics, Q-T25-#5 app-layer name pre-check.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { type Prisma, PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { ConflictError, NotFoundError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { buildWaTemplatesService } from '../index.js';
import type { WaTemplatesService } from '../wa-templates.service.js';

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
let service: WaTemplatesService;

// Canonical ADD-08.2 global names — subset seeded per PM ACK fixture strategy.
const GLOBAL_NAMES = ['qooma_welcome', 'qooma_survey', 'qooma_daily_brief'] as const;

function tplId(prefix: string, index: number): string {
  const idx = String(index).padStart(4, '0');
  const p4 = prefix.repeat(4);
  const p12 = prefix.repeat(12);
  return `1000${idx}-${p4}-4${p4.slice(1)}-8${p4.slice(1)}-${p12}`;
}

function silentLogger(): Logger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });

  // Global rows (is_global=true, hotel_id=null).
  for (let i = 0; i < GLOBAL_NAMES.length; i += 1) {
    const name = GLOBAL_NAMES[i];
    if (!name) continue;
    await db.waTemplate.create({
      data: {
        id: tplId('a', i),
        hotelId: null,
        name,
        body: `Global ${name} body`,
        variables: [] as unknown as Prisma.InputJsonValue,
        language: 'id',
        status: 'approved',
        isGlobal: true,
        approvedAt: new Date('2026-06-01T00:00:00.000Z'),
      },
    });
  }

  // Hotel A rows across statuses.
  const hotelARows = [
    { name: 'hotel_a_pending', status: 'pending' as const },
    { name: 'hotel_a_approved', status: 'approved' as const },
    { name: 'hotel_a_rejected', status: 'rejected' as const },
  ];
  for (let i = 0; i < hotelARows.length; i += 1) {
    const r = hotelARows[i];
    if (!r) continue;
    await db.waTemplate.create({
      data: {
        id: tplId('b', i),
        hotelId: HOTEL_A,
        name: r.name,
        body: `Hotel A ${r.name}`,
        variables: ['guest'] as unknown as Prisma.InputJsonValue,
        language: 'id',
        status: r.status,
        isGlobal: false,
        ...(r.status === 'approved'
          ? { approvedAt: new Date('2026-06-05T00:00:00.000Z'), templateIdMeta: 'meta_a' }
          : {}),
        ...(r.status === 'rejected' ? { rejectionReason: 'copy too long' } : {}),
      },
    });
  }

  // Hotel B rows for isolation checks.
  await db.waTemplate.create({
    data: {
      id: tplId('c', 0),
      hotelId: HOTEL_B,
      name: 'hotel_b_only',
      body: 'HB',
      variables: [] as unknown as Prisma.InputJsonValue,
      language: 'id',
      status: 'pending',
      isGlobal: false,
    },
  });
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  const url = container.getConnectionUri();
  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
  db = new PrismaClient({ datasources: { db: { url } } });
  service = buildWaTemplatesService(db, { logger: silentLogger() });
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.waTemplate.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

describe('WaTemplatesService lifecycle (integration)', () => {
  describe('list', () => {
    it('should include globals + hotel-specific rows for HOTEL_A (not HOTEL_B)', async () => {
      const res = await service.list(gmA, {});
      const names = res.data.map((t) => t.name).sort();
      expect(names).toContain('qooma_welcome');
      expect(names).toContain('qooma_survey');
      expect(names).toContain('qooma_daily_brief');
      expect(names).toContain('hotel_a_pending');
      expect(names).not.toContain('hotel_b_only');
    });

    it('should show globals + hotel-specific rows for HOTEL_B', async () => {
      const res = await service.list(gmB, {});
      const names = res.data.map((t) => t.name);
      expect(names).toContain('qooma_welcome');
      expect(names).toContain('hotel_b_only');
      expect(names).not.toContain('hotel_a_pending');
    });

    it('should filter by status', async () => {
      const res = await service.list(gmA, { status: 'approved' });
      // Approved: 3 globals (seeded as approved) + 1 hotel_a_approved.
      expect(res.data.every((t) => t.status === 'approved')).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('create + relay', () => {
    it('should create a hotel-scoped template as pending', async () => {
      const res = await service.create(gmA, {
        name: 'hotel_a_new',
        body: 'Halo {{guestName}}!',
        variables: ['guestName'],
      });
      expect(res.data.status).toBe('pending');
      expect(res.data.is_global).toBe(false);
      expect(res.data.hotel_id).toBe(HOTEL_A);
    });

    it('should enforce Q-T25-#5 pre-check on duplicate name in same hotel', async () => {
      await expect(
        service.create(gmA, { name: 'hotel_a_pending', body: 'dup' }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('should ALLOW same name across different hotels (foundation UNIQUE absent for now)', async () => {
      const res = await service.create(gmB, {
        name: 'hotel_a_pending', // Same name as HOTEL_A's row.
        body: 'x',
      });
      expect(res.data.hotel_id).toBe(HOTEL_B);
    });
  });

  describe('update', () => {
    it('should update body of a pending template', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_pending' },
      });
      if (!row) throw new Error('seed missing');
      const res = await service.update(gmA, row.id, { body: 'updated' });
      expect(res.data.body).toBe('updated');
    });

    it('should 422 WA_TEMPLATE_LOCKED on approved', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_approved' },
      });
      if (!row) throw new Error('seed missing');
      await expect(service.update(gmA, row.id, { body: 'x' })).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it('should 403 on global template edit from hotel', async () => {
      const row = await db.waTemplate.findFirst({ where: { name: 'qooma_welcome' } });
      if (!row) throw new Error('seed missing');
      await expect(service.update(gmA, row.id, { body: 'x' })).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should 404 on cross-tenant update (leak-safe)', async () => {
      const row = await db.waTemplate.findFirst({ where: { name: 'hotel_b_only' } });
      if (!row) throw new Error('seed missing');
      await expect(service.update(gmA, row.id, { body: 'x' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('should Q-T25-#5 pre-check name change against existing hotel names (excluding self)', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_pending' },
      });
      if (!row) throw new Error('seed missing');
      // Renaming to same name = no-op vs self; should succeed.
      const noOp = await service.update(gmA, row.id, { name: 'hotel_a_pending' });
      expect(noOp.data.name).toBe('hotel_a_pending');
      // Rename to another existing = 409.
      const rejected = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_rejected' },
      });
      if (!rejected) throw new Error('seed missing');
      await expect(
        service.update(gmA, row.id, { name: 'hotel_a_rejected' }),
      ).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('remove state-branch', () => {
    it('should hard-delete a pending template (returns null)', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_pending' },
      });
      if (!row) throw new Error('seed missing');
      const res = await service.remove(gmA, row.id);
      expect(res).toBeNull();
      const gone = await db.waTemplate.findUnique({ where: { id: row.id } });
      expect(gone).toBeNull();
    });

    it('should archive an approved template (returns archived row)', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_approved' },
      });
      if (!row) throw new Error('seed missing');
      const res = await service.remove(gmA, row.id);
      expect(res?.data.status).toBe('archived');
      const persisted = await db.waTemplate.findUnique({ where: { id: row.id } });
      expect(persisted?.status).toBe('archived');
    });

    it('should archive a rejected template', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_rejected' },
      });
      if (!row) throw new Error('seed missing');
      const res = await service.remove(gmA, row.id);
      expect(res?.data.status).toBe('archived');
    });

    it('should 409 WA_TEMPLATE_ALREADY_ARCHIVED on re-delete (Q-T25-#3)', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_approved' },
      });
      if (!row) throw new Error('seed missing');
      await service.remove(gmA, row.id); // archive
      await expect(service.remove(gmA, row.id)).rejects.toBeInstanceOf(ConflictError);
    });

    it('should 403 on global template delete from hotel', async () => {
      const row = await db.waTemplate.findFirst({ where: { name: 'qooma_survey' } });
      if (!row) throw new Error('seed missing');
      await expect(service.remove(gmA, row.id)).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('resubmit', () => {
    it('should flip rejected → pending + clear rejection_reason + relay', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_rejected' },
      });
      if (!row) throw new Error('seed missing');
      const res = await service.resubmit(gmA, row.id);
      expect(res.data.status).toBe('pending');
      expect(res.data.rejection_reason).toBeNull();
    });

    it('should 422 WA_TEMPLATE_NOT_REJECTED when target is pending', async () => {
      const row = await db.waTemplate.findFirst({
        where: { hotelId: HOTEL_A, name: 'hotel_a_pending' },
      });
      if (!row) throw new Error('seed missing');
      await expect(service.resubmit(gmA, row.id)).rejects.toMatchObject({ statusCode: 422 });
    });
  });

  describe('DB-level scope XOR CHECK', () => {
    it('should reject is_global=true with a non-null hotel_id at the DB', async () => {
      await expect(
        db.waTemplate.create({
          data: {
            id: '99999999-9999-4999-8999-999999999999',
            hotelId: HOTEL_A,
            name: 'bad_global',
            body: 'b',
            variables: [] as unknown as Prisma.InputJsonValue,
            language: 'id',
            status: 'pending',
            isGlobal: true,
          },
        }),
      ).rejects.toBeDefined();
    });

    it('should reject is_global=false with hotel_id NULL at the DB', async () => {
      await expect(
        db.waTemplate.create({
          data: {
            id: '99999999-9999-4999-8999-999999999998',
            hotelId: null,
            name: 'bad_hotel_scope',
            body: 'b',
            variables: [] as unknown as Prisma.InputJsonValue,
            language: 'id',
            status: 'pending',
            isGlobal: false,
          },
        }),
      ).rejects.toBeDefined();
    });

    it('should reject status outside the CHECK enum at the DB', async () => {
      await expect(
        db.waTemplate.create({
          data: {
            id: '99999999-9999-4999-8999-999999999997',
            hotelId: HOTEL_A,
            name: 'bad_status',
            body: 'b',
            variables: [] as unknown as Prisma.InputJsonValue,
            language: 'id',
            status: 'in_progress', // Invalid — not in wa_templates_status_check enum.
            isGlobal: false,
          },
        }),
      ).rejects.toBeDefined();
    });
  });
});
