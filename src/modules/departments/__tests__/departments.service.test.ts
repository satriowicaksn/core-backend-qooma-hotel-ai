import { describe, expect, it, jest } from '@jest/globals';

import { ConflictError, NotFoundError, ValidationError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { DepartmentsRepository } from '../departments.repository.js';
import { parseCreateDepartmentBody, parseUpdateDepartmentBody } from '../departments.schema.js';
import { serializeDepartment } from '../departments.serializer.js';
import { buildDepartmentWhere, DepartmentsService } from '../departments.service.js';
import type { DepartmentRow } from '../departments.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DEPT_ID_A = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
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

function makeRow(overrides: Partial<DepartmentRow> = {}): DepartmentRow {
  return {
    id: DEPT_ID_A,
    hotelId: HOTEL_A,
    name: 'Housekeeping',
    code: 'HSK',
    operatingHours: {},
    escalationChain: {},
    telegramChatId: null,
    supervisorTelegramId: null,
    isActive: true,
    createdAt: new Date('2026-06-11T07:00:00.000Z'),
    updatedAt: new Date('2026-06-11T07:00:00.000Z'),
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<DepartmentsRepository>): DepartmentsRepository {
  return {
    findMany: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    create: () => Promise.resolve(makeRow()),
    update: (id: string) => Promise.resolve(makeRow({ id })),
    delete: () => Promise.resolve(),
    countOpenTickets: () => Promise.resolve(0),
    ...overrides,
  } as unknown as DepartmentsRepository;
}

function svc(repo: DepartmentsRepository, logger?: Logger): DepartmentsService {
  return new DepartmentsService(repo, {
    skipCrossDbChecks: true,
    nodeEnv: 'development',
    ...(logger ? { logger } : {}),
  });
}

function prismaP2002(): Error {
  const err = new Error('unique violation') as Error & { code: string };
  err.code = 'P2002';
  return err;
}

describe('buildDepartmentWhere (tenant scope)', () => {
  it('should scope by hotelId when not super_admin', () => {
    expect(buildDepartmentWhere(ctx(), {})).toEqual({ hotelId: HOTEL_A });
  });

  it('should NOT scope by hotelId when super_admin (cross-hotel bypass)', () => {
    expect(buildDepartmentWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {})).toEqual({});
  });

  it('should add an isActive filter when present', () => {
    expect(buildDepartmentWhere(ctx(), { isActive: true })).toEqual({
      hotelId: HOTEL_A,
      isActive: true,
    });
  });
});

describe('zod parsers', () => {
  it('should accept a valid create body', () => {
    const body = parseCreateDepartmentBody({
      name: 'Housekeeping',
      code: 'HSK',
      escalation_chain: { l1_sla_minutes: 5 },
    });
    expect(body.code).toBe('HSK');
  });

  it('should reject an invalid code (fails CHECK regex)', () => {
    expect(() => parseCreateDepartmentBody({ name: 'x', code: 'hsk' })).toThrow(ValidationError);
  });

  it('should reject an empty update body', () => {
    expect(() => parseUpdateDepartmentBody({})).toThrow(ValidationError);
  });

  it('should reject an unknown field (strict)', () => {
    expect(() => parseCreateDepartmentBody({ name: 'x', code: 'HSK', extra: 'nope' })).toThrow(
      ValidationError,
    );
  });

  it('should reject skip_to_l3_categories over 20 items', () => {
    const big = Array.from({ length: 21 }, (_, i) => `cat${i}`);
    expect(() =>
      parseCreateDepartmentBody({
        name: 'x',
        code: 'HSK',
        escalation_chain: { l1_sla_minutes: 5, skip_to_l3_categories: big },
      }),
    ).toThrow(ValidationError);
  });
});

describe('serializeDepartment', () => {
  it('should snake_case the row and include hotel_id', () => {
    const wire = serializeDepartment(
      makeRow({ escalationChain: { l1_sla_minutes: 5 }, telegramChatId: '@hsk' }),
    );
    expect(wire).toEqual({
      id: DEPT_ID_A,
      hotel_id: HOTEL_A,
      name: 'Housekeeping',
      code: 'HSK',
      operating_hours: {},
      escalation_chain: { l1_sla_minutes: 5 },
      telegram_chat_id: '@hsk',
      supervisor_telegram_id: null,
      is_active: true,
      created_at: '2026-06-11T07:00:00.000Z',
      updated_at: '2026-06-11T07:00:00.000Z',
    });
  });
});

describe('DepartmentsService', () => {
  describe('list', () => {
    it('should return departments scoped to the tenant', async () => {
      const rows = [makeRow({ code: 'HSK' }), makeRow({ id: 'd2', code: 'FNB' })];
      const service = svc(fakeRepo({ findMany: () => Promise.resolve(rows) }));
      const res = await service.list(ctx(), {});
      expect(res.data).toHaveLength(2);
      expect(res.data[0]?.hotel_id).toBe(HOTEL_A);
    });
  });

  describe('detail', () => {
    it('should return the department when owned by tenant', async () => {
      const service = svc(fakeRepo({ findById: () => Promise.resolve(makeRow()) }));
      const res = await service.detail(ctx(), DEPT_ID_A);
      expect(res.data.code).toBe('HSK');
    });

    it('should throw NotFoundError when repository returns null', async () => {
      const service = svc(fakeRepo({ findById: () => Promise.resolve(null) }));
      await expect(service.detail(ctx(), 'missing')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NotFoundError on cross-tenant fetch (leak-safe)', async () => {
      const service = svc(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
      );
      await expect(service.detail(ctx(), DEPT_ID_A)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should allow super_admin cross-hotel fetch', async () => {
      const service = svc(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
      );
      const superCtx = ctx({ isSuperAdmin: true, role: 'super_admin' });
      const res = await service.detail(superCtx, DEPT_ID_A);
      expect(res.data.hotel_id).toBe(HOTEL_B);
    });
  });

  describe('create', () => {
    it('should sink hotel_id from the tenant, never from body', async () => {
      const create = jest.fn<DepartmentsRepository['create']>().mockResolvedValue(makeRow());
      const service = svc(fakeRepo({ create }));
      await service.create(ctx(), { name: 'HSK', code: 'HSK' });
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ hotelId: HOTEL_A }));
    });

    it('should translate Prisma P2002 to ConflictError with DEPARTMENT_CODE_TAKEN', async () => {
      const service = svc(fakeRepo({ create: () => Promise.reject(prismaP2002()) }));
      try {
        await service.create(ctx(), { name: 'HSK', code: 'HSK' });
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictError);
        expect((err as ConflictError).details.reason).toBe('DEPARTMENT_CODE_TAKEN');
      }
    });

    it('should rethrow non-P2002 errors as-is', async () => {
      const other = new Error('boom');
      const service = svc(fakeRepo({ create: () => Promise.reject(other) }));
      await expect(service.create(ctx(), { name: 'x', code: 'HSK' })).rejects.toBe(other);
    });
  });

  describe('update', () => {
    it('should 404 when target belongs to a different tenant', async () => {
      const service = svc(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
      );
      await expect(service.update(ctx(), DEPT_ID_A, { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('should translate P2002 on update to DEPARTMENT_CODE_TAKEN', async () => {
      const service = svc(
        fakeRepo({
          findById: () => Promise.resolve(makeRow()),
          update: () => Promise.reject(prismaP2002()),
        }),
      );
      try {
        await service.update(ctx(), DEPT_ID_A, { code: 'FNB' });
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictError);
        expect((err as ConflictError).details.reason).toBe('DEPARTMENT_CODE_TAKEN');
        expect((err as ConflictError).details.code).toBe('FNB');
      }
    });
  });

  describe('remove', () => {
    it('should 409 when open tickets reference the department', async () => {
      const service = svc(
        fakeRepo({
          findById: () => Promise.resolve(makeRow()),
          countOpenTickets: () => Promise.resolve(3),
        }),
      );
      try {
        await service.remove(ctx(), DEPT_ID_A);
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictError);
        expect((err as ConflictError).details.reason).toBe('DEPARTMENT_HAS_OPEN_TICKETS');
        expect((err as ConflictError).details.openTickets).toBe(3);
      }
    });

    it('should delete when no open tickets reference the department', async () => {
      const del = jest.fn<DepartmentsRepository['delete']>().mockResolvedValue();
      const service = svc(
        fakeRepo({
          findById: () => Promise.resolve(makeRow()),
          countOpenTickets: () => Promise.resolve(0),
          delete: del,
        }),
      );
      await service.remove(ctx(), DEPT_ID_A);
      expect(del).toHaveBeenCalledWith(DEPT_ID_A);
    });

    it('should 404 when target belongs to a different tenant', async () => {
      const service = svc(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
      );
      await expect(service.remove(ctx(), DEPT_ID_A)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('Q-C-02 startup warning', () => {
    it('should warn once when skipCrossDbChecks=true AND nodeEnv=production', () => {
      const warn = jest.fn();
      const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
      new DepartmentsService(fakeRepo({}), {
        skipCrossDbChecks: true,
        nodeEnv: 'production',
        logger,
      });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'cross_db_check_skip', env: 'production' }),
      );
    });

    it('should NOT warn in development even with skipCrossDbChecks=true', () => {
      const warn = jest.fn();
      const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
      new DepartmentsService(fakeRepo({}), {
        skipCrossDbChecks: true,
        nodeEnv: 'development',
        logger,
      });
      expect(warn).not.toHaveBeenCalled();
    });
  });
});
