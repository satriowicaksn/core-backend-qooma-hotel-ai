import { describe, expect, it, jest } from '@jest/globals';
import type { PrismaClient } from '@prisma/client';

import { BusinessRuleError, NotFoundError, ValidationError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { AgentsRepository } from '../agents.repository.js';
import { parseListAgentsQuery, parseUpdateAgentBody } from '../agents.schema.js';
import { serializeAgent } from '../agents.serializer.js';
import { AgentsService, buildAgentWhere } from '../agents.service.js';
import type { AgentRow } from '../agents.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const AGENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const USER_ID = '11111111-1111-4111-8111-111111111111';

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: USER_ID,
    hotelId: HOTEL_A,
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function makeRow(overrides: Partial<AgentRow> = {}): AgentRow {
  return {
    id: AGENT_ID,
    hotelId: HOTEL_A,
    agentType: 'concierge',
    name: 'Concierge Agent',
    isActive: true,
    capacity: 3,
    config: {},
    createdAt: new Date('2026-06-11T07:00:00.000Z'),
    updatedAt: new Date('2026-06-11T07:00:00.000Z'),
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<AgentsRepository> = {}): AgentsRepository {
  return {
    findMany: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    update: (id: string) => Promise.resolve(makeRow({ id })),
    ...overrides,
  } as unknown as AgentsRepository;
}

// Fake PrismaClient whose $transaction runs the callback with a stub `tx`
// object whose only interesting method is `aiAgentConfig.count` + `update`.
interface TxStub {
  count: number;
  updated: AgentRow;
}

function fakeDb(stub: TxStub): PrismaClient {
  const tx = {
    aiAgentConfig: {
      count: () => Promise.resolve(stub.count),
      update: () => Promise.resolve(stub.updated),
    },
  };
  return {
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaClient;
}

function serializationFailure(): Error {
  const err = new Error('serialization failure') as Error & { code: string };
  err.code = 'P2034';
  return err;
}

describe('zod parsers', () => {
  it('should accept a valid update body with is_active only', () => {
    expect(parseUpdateAgentBody({ is_active: false })).toEqual({ is_active: false });
  });

  it('should accept a valid update body with capacity + config', () => {
    expect(parseUpdateAgentBody({ capacity: 5, config: { locale: 'id' } })).toEqual({
      capacity: 5,
      config: { locale: 'id' },
    });
  });

  it('should reject an empty update body', () => {
    expect(() => parseUpdateAgentBody({})).toThrow(ValidationError);
  });

  it('should reject an immutable field on update (strict — agent_type)', () => {
    expect(() => parseUpdateAgentBody({ is_active: true, agent_type: 'butler' })).toThrow(
      ValidationError,
    );
  });

  it('should reject capacity below 1', () => {
    expect(() => parseUpdateAgentBody({ capacity: 0 })).toThrow(ValidationError);
  });

  it('should reject capacity above 100', () => {
    expect(() => parseUpdateAgentBody({ capacity: 101 })).toThrow(ValidationError);
  });

  it('should accept capacity at the ceiling (100)', () => {
    expect(parseUpdateAgentBody({ capacity: 100 })).toEqual({ capacity: 100 });
  });

  it('should parse list query is_active boolFlag', () => {
    expect(parseListAgentsQuery({ is_active: 'true' })).toEqual({ isActive: true });
    expect(parseListAgentsQuery({ is_active: 'false' })).toEqual({ isActive: false });
    expect(parseListAgentsQuery({})).toEqual({});
  });
});

describe('buildAgentWhere (tenant scope)', () => {
  it('should scope by hotelId when not super_admin', () => {
    expect(buildAgentWhere(ctx(), {})).toEqual({ hotelId: HOTEL_A });
  });

  it('should NOT scope when super_admin (cross-hotel bypass)', () => {
    expect(buildAgentWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {})).toEqual({});
  });

  it('should add isActive filter when present', () => {
    expect(buildAgentWhere(ctx(), { isActive: true })).toEqual({
      hotelId: HOTEL_A,
      isActive: true,
    });
  });
});

describe('serializeAgent', () => {
  it('should snake_case the row and preserve config JSONB', () => {
    const wire = serializeAgent(makeRow({ config: { locale: 'id', tone: 'formal' } }));
    expect(wire).toEqual({
      id: AGENT_ID,
      hotel_id: HOTEL_A,
      agent_type: 'concierge',
      name: 'Concierge Agent',
      is_active: true,
      capacity: 3,
      config: { locale: 'id', tone: 'formal' },
      created_at: '2026-06-11T07:00:00.000Z',
      updated_at: '2026-06-11T07:00:00.000Z',
    });
  });

  it('should default non-object config to {} defensively', () => {
    const wire = serializeAgent(
      makeRow({ config: 'garbage' as unknown as Record<string, unknown> }),
    );
    expect(wire.config).toEqual({});
  });
});

describe('AgentsService.list', () => {
  it('should return agents scoped to tenant', async () => {
    const rows = [makeRow({ agentType: 'a1' }), makeRow({ id: 'x', agentType: 'a2' })];
    const service = new AgentsService(
      fakeRepo({ findMany: () => Promise.resolve(rows) }),
      fakeDb({ count: 0, updated: makeRow() }),
    );
    const res = await service.list(ctx(), {});
    expect(res.data).toHaveLength(2);
    expect(res.data[0]?.agent_type).toBe('a1');
  });
});

describe('AgentsService.update — cross-tenant + not-found', () => {
  it('should 404 when repo returns null', async () => {
    const service = new AgentsService(
      fakeRepo({ findById: () => Promise.resolve(null) }),
      fakeDb({ count: 0, updated: makeRow() }),
    );
    await expect(service.update(ctx(), AGENT_ID, { is_active: false })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('should 404 on cross-tenant update (leak-safe)', async () => {
    const service = new AgentsService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
      fakeDb({ count: 0, updated: makeRow() }),
    );
    await expect(service.update(ctx(), AGENT_ID, { is_active: false })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe('AgentsService.update — Min-3 rule (toggle-off)', () => {
  it('should 422 MIN_AGENTS_VIOLATION when toggle-off would drop below 3', async () => {
    // 3 active → toggle-off → activeAfter = 2 → violation.
    const service = new AgentsService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ isActive: true })) }),
      fakeDb({ count: 3, updated: makeRow({ isActive: false }) }),
    );
    try {
      await service.update(ctx(), AGENT_ID, { is_active: false });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessRuleError);
      expect((err as BusinessRuleError).details.rule).toBe('MIN_AGENTS_VIOLATION');
      expect((err as BusinessRuleError).details.activeAfter).toBe(2);
      expect((err as BusinessRuleError).details.minRequired).toBe(3);
    }
  });

  it('should allow toggle-off when 4 active remain (activeAfter=3)', async () => {
    // 4 active → toggle-off → activeAfter = 3 → allowed.
    const service = new AgentsService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ isActive: true })) }),
      fakeDb({ count: 4, updated: makeRow({ isActive: false }) }),
    );
    const res = await service.update(ctx(), AGENT_ID, { is_active: false });
    expect(res.data.is_active).toBe(false);
  });
});

describe('AgentsService.update — toggle-on (no tier-cap slice-1)', () => {
  it('should activate an inactive agent without cap check (Q-T28-#1 dropped)', async () => {
    const update = jest
      .fn<AgentsRepository['update']>()
      .mockResolvedValue(makeRow({ isActive: true }));
    const service = new AgentsService(
      fakeRepo({
        findById: () => Promise.resolve(makeRow({ isActive: false })),
        update,
      }),
      fakeDb({ count: 3, updated: makeRow() }),
    );
    const res = await service.update(ctx(), AGENT_ID, { is_active: true });
    expect(res.data.is_active).toBe(true);
    // Non-toggle-off path uses plain repo.update, not the transaction.
    expect(update).toHaveBeenCalled();
  });
});

describe('AgentsService.update — no-op idempotency', () => {
  it('should return current row on same-state toggle-on (already active)', async () => {
    const update = jest.fn<AgentsRepository['update']>();
    const service = new AgentsService(
      fakeRepo({
        findById: () => Promise.resolve(makeRow({ isActive: true })),
        update,
      }),
      fakeDb({ count: 3, updated: makeRow() }),
    );
    const res = await service.update(ctx(), AGENT_ID, { is_active: true });
    expect(res.data.is_active).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it('should return current row on same-state toggle-off (already inactive)', async () => {
    const update = jest.fn<AgentsRepository['update']>();
    const service = new AgentsService(
      fakeRepo({
        findById: () => Promise.resolve(makeRow({ isActive: false })),
        update,
      }),
      fakeDb({ count: 3, updated: makeRow() }),
    );
    const res = await service.update(ctx(), AGENT_ID, { is_active: false });
    expect(res.data.is_active).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('should return current row when capacity is unchanged (no delta)', async () => {
    const update = jest.fn<AgentsRepository['update']>();
    const service = new AgentsService(
      fakeRepo({
        findById: () => Promise.resolve(makeRow({ capacity: 3 })),
        update,
      }),
      fakeDb({ count: 3, updated: makeRow() }),
    );
    const res = await service.update(ctx(), AGENT_ID, { capacity: 3 });
    expect(res.data.capacity).toBe(3);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('AgentsService.update — capacity + config only (plain update)', () => {
  it('should update capacity only via plain repo.update (no transaction)', async () => {
    const update = jest
      .fn<AgentsRepository['update']>()
      .mockResolvedValue(makeRow({ capacity: 5 }));
    const service = new AgentsService(
      fakeRepo({
        findById: () => Promise.resolve(makeRow({ capacity: 3 })),
        update,
      }),
      fakeDb({ count: 3, updated: makeRow() }),
    );
    const res = await service.update(ctx(), AGENT_ID, { capacity: 5 });
    expect(res.data.capacity).toBe(5);
    expect(update).toHaveBeenCalledWith(AGENT_ID, { capacity: 5 });
  });

  it('should update config only via plain repo.update', async () => {
    const update = jest
      .fn<AgentsRepository['update']>()
      .mockResolvedValue(makeRow({ config: { tone: 'casual' } }));
    const service = new AgentsService(
      fakeRepo({
        findById: () => Promise.resolve(makeRow()),
        update,
      }),
      fakeDb({ count: 3, updated: makeRow() }),
    );
    const res = await service.update(ctx(), AGENT_ID, { config: { tone: 'casual' } });
    expect(res.data.config).toEqual({ tone: 'casual' });
  });
});

describe('AgentsService.update — Serializable retry on P2034', () => {
  it('should retry once on P2034 then succeed', async () => {
    let calls = 0;
    const flakyDb = {
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => {
        calls += 1;
        if (calls === 1) {
          return Promise.reject(serializationFailure());
        }
        const tx = {
          aiAgentConfig: {
            count: () => Promise.resolve(4),
            update: () => Promise.resolve(makeRow({ isActive: false })),
          },
        };
        return fn(tx);
      },
    } as unknown as PrismaClient;
    const service = new AgentsService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ isActive: true })) }),
      flakyDb,
    );
    const res = await service.update(ctx(), AGENT_ID, { is_active: false });
    expect(res.data.is_active).toBe(false);
    expect(calls).toBe(2);
  });

  it('should bubble the second P2034 (no infinite retry)', async () => {
    let calls = 0;
    const alwaysFlakyDb = {
      $transaction: () => {
        calls += 1;
        return Promise.reject(serializationFailure());
      },
    } as unknown as PrismaClient;
    const service = new AgentsService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ isActive: true })) }),
      alwaysFlakyDb,
    );
    await expect(service.update(ctx(), AGENT_ID, { is_active: false })).rejects.toHaveProperty(
      'code',
      'P2034',
    );
    expect(calls).toBe(2);
  });

  it('should NOT retry on a non-serialization error', async () => {
    let calls = 0;
    const errorDb = {
      $transaction: () => {
        calls += 1;
        return Promise.reject(new Error('unexpected'));
      },
    } as unknown as PrismaClient;
    const service = new AgentsService(
      fakeRepo({ findById: () => Promise.resolve(makeRow({ isActive: true })) }),
      errorDb,
    );
    await expect(service.update(ctx(), AGENT_ID, { is_active: false })).rejects.toThrow(
      'unexpected',
    );
    expect(calls).toBe(1);
  });
});
