// Integration: real Postgres via testcontainers (TESTING.md §5 — no Prisma mock).
// Crux (T28): UNIQUE(hotel_id, agent_type) + tenant isolation. ADD-25: the
// minimum-agent floor is revoked — toggle-off is always allowed.

import { execFileSync } from 'node:child_process';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { NotFoundError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { AgentsService } from '../agents.service.js';
import { buildAgentsService } from '../index.js';

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
let service: AgentsService;

// Canonical agent types for HOTEL_A seed (4 active + 1 inactive).
const HOTEL_A_AGENTS = [
  { type: 'concierge', name: 'Concierge', isActive: true },
  { type: 'reception', name: 'Reception', isActive: true },
  { type: 'housekeeping', name: 'Housekeeping', isActive: true },
  { type: 'fnb', name: 'F&B', isActive: true },
  { type: 'wellness', name: 'Wellness', isActive: false },
] as const;

// HOTEL_B seed: 3 active.
const HOTEL_B_AGENTS = [
  { type: 'concierge', name: 'Concierge B', isActive: true },
  { type: 'reception', name: 'Reception B', isActive: true },
  { type: 'fnb', name: 'F&B B', isActive: true },
] as const;

function agentId(hotel: 'A' | 'B', index: number): string {
  const seg = hotel === 'A' ? 'aaaa' : 'bbbb';
  const idx = String(index).padStart(4, '0');
  return `1000${idx}-${seg}-4${seg.slice(1)}-8${seg.slice(1)}-${seg.repeat(3)}`;
}

async function seed(): Promise<void> {
  await db.hotel.createMany({ data: [{ id: HOTEL_A }, { id: HOTEL_B }] });

  for (let i = 0; i < HOTEL_A_AGENTS.length; i += 1) {
    const a = HOTEL_A_AGENTS[i];
    if (!a) continue;
    await db.aiAgentConfig.create({
      data: {
        id: agentId('A', i),
        hotelId: HOTEL_A,
        agentType: a.type,
        name: a.name,
        isActive: a.isActive,
      },
    });
  }
  for (let i = 0; i < HOTEL_B_AGENTS.length; i += 1) {
    const a = HOTEL_B_AGENTS[i];
    if (!a) continue;
    await db.aiAgentConfig.create({
      data: {
        id: agentId('B', i),
        hotelId: HOTEL_B,
        agentType: a.type,
        name: a.name,
        isActive: a.isActive,
      },
    });
  }
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:15-alpine').start();
  const url = container.getConnectionUri();
  execFileSync('pnpm', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
  db = new PrismaClient({ datasources: { db: { url } } });
  service = buildAgentsService(db);
}, 180_000);

afterAll(async () => {
  await db?.$disconnect();
  await container?.stop();
});

beforeEach(async () => {
  await db.aiAgentConfig.deleteMany();
  await db.hotel.deleteMany();
  await seed();
});

describe('AgentsService list + tenant isolation (integration)', () => {
  it('should list only the current hotel agents', async () => {
    const res = await service.list(gmA, {});
    expect(res.data).toHaveLength(HOTEL_A_AGENTS.length);
    expect(res.data.every((a) => a.hotel_id === HOTEL_A)).toBe(true);
  });

  it('should filter list by is_active=true', async () => {
    const res = await service.list(gmA, { isActive: true });
    // HOTEL_A has 4 active seed.
    expect(res.data).toHaveLength(4);
    expect(res.data.every((a) => a.is_active)).toBe(true);
  });

  it('should filter list by is_active=false', async () => {
    const res = await service.list(gmA, { isActive: false });
    expect(res.data).toHaveLength(1);
    expect(res.data[0]?.agent_type).toBe('wellness');
  });

  it('should NOT expose HOTEL_A agents to HOTEL_B', async () => {
    const res = await service.list(gmB, {});
    expect(res.data).toHaveLength(HOTEL_B_AGENTS.length);
    expect(res.data.every((a) => a.hotel_id === HOTEL_B)).toBe(true);
  });
});

describe('AgentsService update — toggle-off (ADD-25: no minimum-agent floor)', () => {
  it('should allow toggle-off even below the old 3-agent floor (HOTEL_B 3 → 2 after)', async () => {
    const conciergeB = await db.aiAgentConfig.findFirst({
      where: { hotelId: HOTEL_B, agentType: 'concierge' },
    });
    if (!conciergeB) throw new Error('seed missing');
    const res = await service.update(gmB, conciergeB.id, { is_active: false });
    expect(res.data.is_active).toBe(false);
    const still = await db.aiAgentConfig.findUnique({ where: { id: conciergeB.id } });
    expect(still?.isActive).toBe(false);
    const activeCount = await db.aiAgentConfig.count({
      where: { hotelId: HOTEL_B, isActive: true },
    });
    expect(activeCount).toBe(2);
  });

  it('should allow toggle-off when 4 active remain (HOTEL_A → 3 after)', async () => {
    const conciergeA = await db.aiAgentConfig.findFirst({
      where: { hotelId: HOTEL_A, agentType: 'concierge' },
    });
    if (!conciergeA) throw new Error('seed missing');
    const res = await service.update(gmA, conciergeA.id, { is_active: false });
    expect(res.data.is_active).toBe(false);
    const activeCount = await db.aiAgentConfig.count({
      where: { hotelId: HOTEL_A, isActive: true },
    });
    expect(activeCount).toBe(3);
  });

  it('should reactivate an inactive agent without cap check (Q-T28-#1 dropped in slice-1)', async () => {
    const wellness = await db.aiAgentConfig.findFirst({
      where: { hotelId: HOTEL_A, agentType: 'wellness' },
    });
    if (!wellness) throw new Error('seed missing');
    const res = await service.update(gmA, wellness.id, { is_active: true });
    expect(res.data.is_active).toBe(true);
  });
});

describe('AgentsService update — capacity + config + idempotency', () => {
  it('should update capacity via plain update (outside transaction)', async () => {
    const wellness = await db.aiAgentConfig.findFirst({
      where: { hotelId: HOTEL_A, agentType: 'wellness' },
    });
    if (!wellness) throw new Error('seed missing');
    const res = await service.update(gmA, wellness.id, { capacity: 10 });
    expect(res.data.capacity).toBe(10);
  });

  it('should merge config JSONB (Prisma passes through)', async () => {
    const conciergeA = await db.aiAgentConfig.findFirst({
      where: { hotelId: HOTEL_A, agentType: 'concierge' },
    });
    if (!conciergeA) throw new Error('seed missing');
    const res = await service.update(gmA, conciergeA.id, {
      config: { locale: 'id', tone: 'formal' },
    });
    expect(res.data.config).toEqual({ locale: 'id', tone: 'formal' });
  });

  it('should idempotently return current row on same-state toggle-on', async () => {
    const conciergeA = await db.aiAgentConfig.findFirst({
      where: { hotelId: HOTEL_A, agentType: 'concierge' },
    });
    if (!conciergeA) throw new Error('seed missing');
    const res = await service.update(gmA, conciergeA.id, { is_active: true });
    expect(res.data.is_active).toBe(true);
  });
});

describe('AgentsService update — cross-tenant + not-found', () => {
  it('should 404 on cross-tenant PATCH', async () => {
    const conciergeB = await db.aiAgentConfig.findFirst({
      where: { hotelId: HOTEL_B, agentType: 'concierge' },
    });
    if (!conciergeB) throw new Error('seed missing');
    await expect(service.update(gmA, conciergeB.id, { capacity: 2 })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should enforce UNIQUE(hotel_id, agent_type) at the DB', async () => {
    await expect(
      db.aiAgentConfig.create({
        data: {
          id: '99999999-9999-4999-8999-999999999999',
          hotelId: HOTEL_A,
          agentType: 'concierge', // duplicate for HOTEL_A
          name: 'Duplicate',
        },
      }),
    ).rejects.toBeDefined();
  });
});
