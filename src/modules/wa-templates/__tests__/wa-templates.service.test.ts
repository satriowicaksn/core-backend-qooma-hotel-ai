import { describe, expect, it, jest } from '@jest/globals';

import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type {
  IntegrationRelayPort,
  IntegrationRelayResult,
  IntegrationRelaySubmitInput,
} from '../ports/integration-relay.port.js';
import type { WaTemplatesRepository } from '../wa-templates.repository.js';
import { parseCreateWaTemplateBody, parseUpdateWaTemplateBody } from '../wa-templates.schema.js';
import { serializeWaTemplate } from '../wa-templates.serializer.js';
import { buildWaTemplateWhere, WaTemplatesService } from '../wa-templates.service.js';
import type { WaTemplateRow } from '../wa-templates.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const HOTEL_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TEMPLATE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
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

function makeRow(overrides: Partial<WaTemplateRow> = {}): WaTemplateRow {
  return {
    id: TEMPLATE_ID,
    hotelId: HOTEL_A,
    name: 'welcome_local',
    body: 'Halo {{name}}!',
    variables: ['name'],
    language: 'id',
    status: 'pending',
    templateIdMeta: null,
    rejectionReason: null,
    isGlobal: false,
    approvedAt: null,
    createdAt: new Date('2026-06-11T07:00:00.000Z'),
    updatedAt: new Date('2026-06-11T07:00:00.000Z'),
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<WaTemplatesRepository>): WaTemplatesRepository {
  return {
    findMany: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    create: () => Promise.resolve(makeRow()),
    update: (id: string) => Promise.resolve(makeRow({ id })),
    delete: () => Promise.resolve(),
    countByHotelAndName: () => Promise.resolve(0),
    ...overrides,
  } as unknown as WaTemplatesRepository;
}

function relayResult(): IntegrationRelayResult {
  return { messageId: 'msg-1', relayedAt: new Date('2026-06-11T07:05:00.000Z') };
}

function fakeRelay(
  spy?: jest.Mock<(input: IntegrationRelaySubmitInput) => Promise<IntegrationRelayResult>>,
): IntegrationRelayPort {
  return {
    relaySubmit: spy ?? (() => Promise.resolve(relayResult())),
  };
}

function prismaP2002(): Error {
  const err = new Error('unique violation') as Error & { code: string };
  err.code = 'P2002';
  return err;
}

describe('buildWaTemplateWhere (tenant scope + global overlay)', () => {
  it('should OR global with hotelId when not super_admin', () => {
    expect(buildWaTemplateWhere(ctx(), {})).toEqual({
      OR: [{ isGlobal: true }, { hotelId: HOTEL_A }],
    });
  });

  it('should NOT scope when super_admin (cross-hotel bypass)', () => {
    expect(buildWaTemplateWhere(ctx({ isSuperAdmin: true, role: 'super_admin' }), {})).toEqual({});
  });

  it('should nest under AND when status filter is present', () => {
    expect(buildWaTemplateWhere(ctx(), { status: 'pending' })).toEqual({
      AND: [{ OR: [{ isGlobal: true }, { hotelId: HOTEL_A }] }, { status: 'pending' }],
    });
  });
});

describe('zod parsers', () => {
  it('should accept a valid create body', () => {
    const body = parseCreateWaTemplateBody({
      name: 'hotel_promo',
      body: 'Discount for {{guestName}}',
      variables: ['guestName'],
      language: 'id',
    });
    expect(body.name).toBe('hotel_promo');
  });

  it('should default variables and language to unset (service applies defaults)', () => {
    const body = parseCreateWaTemplateBody({ name: 'x', body: 'y' });
    expect(body.variables).toBeUndefined();
    expect(body.language).toBeUndefined();
  });

  it('should reject an unknown field on create (strict)', () => {
    expect(() =>
      parseCreateWaTemplateBody({
        name: 'x',
        body: 'y',
        is_global: true,
      }),
    ).toThrow(ValidationError);
  });

  it('should reject empty update body', () => {
    expect(() => parseUpdateWaTemplateBody({})).toThrow(ValidationError);
  });

  it('should reject variables that are not strings', () => {
    expect(() =>
      parseCreateWaTemplateBody({
        name: 'x',
        body: 'y',
        variables: [123],
      }),
    ).toThrow(ValidationError);
  });

  it('should reject language shorter than 2 chars', () => {
    expect(() => parseCreateWaTemplateBody({ name: 'x', body: 'y', language: 'i' })).toThrow(
      ValidationError,
    );
  });

  it('should reject over 50 variables', () => {
    const big = Array.from({ length: 51 }, (_, i) => `v${i}`);
    expect(() => parseCreateWaTemplateBody({ name: 'x', body: 'y', variables: big })).toThrow(
      ValidationError,
    );
  });
});

describe('serializeWaTemplate', () => {
  it('should snake_case a row and coerce variables to string[]', () => {
    const wire = serializeWaTemplate(
      makeRow({
        approvedAt: new Date('2026-06-11T08:00:00.000Z'),
        templateIdMeta: 'meta-1',
        variables: ['guest', 'room'],
      }),
    );
    expect(wire).toEqual({
      id: TEMPLATE_ID,
      hotel_id: HOTEL_A,
      name: 'welcome_local',
      body: 'Halo {{name}}!',
      variables: ['guest', 'room'],
      language: 'id',
      status: 'pending',
      template_id_meta: 'meta-1',
      rejection_reason: null,
      is_global: false,
      approved_at: '2026-06-11T08:00:00.000Z',
      created_at: '2026-06-11T07:00:00.000Z',
      updated_at: '2026-06-11T07:00:00.000Z',
    });
  });

  it('should filter non-string variables defensively (JSONB anomaly guard)', () => {
    const wire = serializeWaTemplate(makeRow({ variables: ['ok', 42, 'good'] as unknown[] }));
    expect(wire.variables).toEqual(['ok', 'good']);
  });
});

describe('WaTemplatesService', () => {
  describe('list', () => {
    it('should return templates via repo (global + hotel scope built in where)', async () => {
      const rows = [makeRow({ isGlobal: true, hotelId: null }), makeRow({ id: 'x2' })];
      const service = new WaTemplatesService(
        fakeRepo({ findMany: () => Promise.resolve(rows) }),
        fakeRelay(),
      );
      const res = await service.list(ctx(), {});
      expect(res.data).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should hardcode isGlobal=false, status=pending, hotelId from tenant', async () => {
      const create = jest.fn<WaTemplatesRepository['create']>().mockResolvedValue(makeRow());
      const service = new WaTemplatesService(fakeRepo({ create }), fakeRelay());
      await service.create(ctx(), { name: 'x', body: 'y' });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          hotelId: HOTEL_A,
          isGlobal: false,
          status: 'pending',
          language: 'id',
        }),
      );
    });

    it('should call integrationRelay with intent=create after DB create', async () => {
      const relay = jest
        .fn<(input: IntegrationRelaySubmitInput) => Promise<IntegrationRelayResult>>()
        .mockResolvedValue(relayResult());
      const service = new WaTemplatesService(fakeRepo({}), fakeRelay(relay));
      await service.create(ctx(), { name: 'x', body: 'y' });
      expect(relay).toHaveBeenCalledWith(
        expect.objectContaining({ intent: 'create', hotelId: HOTEL_A, name: 'welcome_local' }),
      );
    });

    it('should 409 on Q-T25-#5 pre-check when name already taken', async () => {
      const service = new WaTemplatesService(
        fakeRepo({ countByHotelAndName: () => Promise.resolve(1) }),
        fakeRelay(),
      );
      try {
        await service.create(ctx(), { name: 'dup', body: 'y' });
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictError);
        expect((err as ConflictError).details.reason).toBe('WA_TEMPLATE_NAME_TAKEN');
      }
    });

    it('should translate P2002 to 409 (belt-and-suspenders post-foundation)', async () => {
      const service = new WaTemplatesService(
        fakeRepo({ create: () => Promise.reject(prismaP2002()) }),
        fakeRelay(),
      );
      try {
        await service.create(ctx(), { name: 'x', body: 'y' });
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictError);
        expect((err as ConflictError).details.reason).toBe('WA_TEMPLATE_NAME_TAKEN');
      }
    });
  });

  describe('update', () => {
    it('should 403 when target is a global template (auth before state)', async () => {
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () =>
            Promise.resolve(makeRow({ isGlobal: true, hotelId: null, status: 'pending' })),
        }),
        fakeRelay(),
      );
      try {
        await service.update(ctx(), TEMPLATE_ID, { body: 'x' });
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect((err as ForbiddenError).details.reason).toBe('GLOBAL_TEMPLATE_READONLY');
      }
    });

    it('should 422 WA_TEMPLATE_LOCKED when status=approved', async () => {
      const service = new WaTemplatesService(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ status: 'approved' })) }),
        fakeRelay(),
      );
      try {
        await service.update(ctx(), TEMPLATE_ID, { body: 'x' });
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BusinessRuleError);
        expect((err as BusinessRuleError).details.rule).toBe('WA_TEMPLATE_LOCKED');
      }
    });

    it('should 422 WA_TEMPLATE_LOCKED when status=archived', async () => {
      const service = new WaTemplatesService(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ status: 'archived' })) }),
        fakeRelay(),
      );
      await expect(service.update(ctx(), TEMPLATE_ID, { body: 'x' })).rejects.toBeInstanceOf(
        BusinessRuleError,
      );
    });

    it('should 404 on cross-tenant update (leak-safe)', async () => {
      const service = new WaTemplatesService(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ hotelId: HOTEL_B })) }),
        fakeRelay(),
      );
      await expect(service.update(ctx(), TEMPLATE_ID, { body: 'x' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('should skip name-change pre-check when name is unchanged', async () => {
      const count = jest.fn<WaTemplatesRepository['countByHotelAndName']>().mockResolvedValue(0);
      const service = new WaTemplatesService(
        fakeRepo({ findById: () => Promise.resolve(makeRow()), countByHotelAndName: count }),
        fakeRelay(),
      );
      await service.update(ctx(), TEMPLATE_ID, { name: 'welcome_local', body: 'new body' });
      expect(count).not.toHaveBeenCalled();
    });

    it('should run name-change pre-check with excludeId when name changes', async () => {
      const count = jest.fn<WaTemplatesRepository['countByHotelAndName']>().mockResolvedValue(0);
      const service = new WaTemplatesService(
        fakeRepo({ findById: () => Promise.resolve(makeRow()), countByHotelAndName: count }),
        fakeRelay(),
      );
      await service.update(ctx(), TEMPLATE_ID, { name: 'renamed' });
      expect(count).toHaveBeenCalledWith(HOTEL_A, 'renamed', TEMPLATE_ID);
    });

    it('should 409 when name-change pre-check finds duplicate', async () => {
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () => Promise.resolve(makeRow()),
          countByHotelAndName: () => Promise.resolve(1),
        }),
        fakeRelay(),
      );
      await expect(service.update(ctx(), TEMPLATE_ID, { name: 'taken' })).rejects.toBeInstanceOf(
        ConflictError,
      );
    });

    it('should translate P2002 on update to 409 WA_TEMPLATE_NAME_TAKEN', async () => {
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () => Promise.resolve(makeRow()),
          update: () => Promise.reject(prismaP2002()),
        }),
        fakeRelay(),
      );
      try {
        await service.update(ctx(), TEMPLATE_ID, { body: 'x' });
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictError);
        expect((err as ConflictError).details.reason).toBe('WA_TEMPLATE_NAME_TAKEN');
      }
    });
  });

  describe('remove', () => {
    it('should hard-delete when status=pending (returns null → 204)', async () => {
      const del = jest.fn<WaTemplatesRepository['delete']>().mockResolvedValue();
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () => Promise.resolve(makeRow({ status: 'pending' })),
          delete: del,
        }),
        fakeRelay(),
      );
      const result = await service.remove(ctx(), TEMPLATE_ID);
      expect(result).toBeNull();
      expect(del).toHaveBeenCalledWith(TEMPLATE_ID);
    });

    it('should archive when status=approved (returns archived row → 200)', async () => {
      const update = jest
        .fn<WaTemplatesRepository['update']>()
        .mockResolvedValue(makeRow({ status: 'archived' }));
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () => Promise.resolve(makeRow({ status: 'approved' })),
          update,
        }),
        fakeRelay(),
      );
      const result = await service.remove(ctx(), TEMPLATE_ID);
      expect(result?.data.status).toBe('archived');
      expect(update).toHaveBeenCalledWith(TEMPLATE_ID, { status: 'archived' });
    });

    it('should archive when status=rejected', async () => {
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () => Promise.resolve(makeRow({ status: 'rejected' })),
          update: () => Promise.resolve(makeRow({ status: 'archived' })),
        }),
        fakeRelay(),
      );
      const result = await service.remove(ctx(), TEMPLATE_ID);
      expect(result?.data.status).toBe('archived');
    });

    it('should 409 WA_TEMPLATE_ALREADY_ARCHIVED when status=archived (Q-T25-#3)', async () => {
      const service = new WaTemplatesService(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ status: 'archived' })) }),
        fakeRelay(),
      );
      try {
        await service.remove(ctx(), TEMPLATE_ID);
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ConflictError);
        expect((err as ConflictError).details.reason).toBe('WA_TEMPLATE_ALREADY_ARCHIVED');
      }
    });

    it('should 403 on global template delete (auth before state)', async () => {
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () =>
            Promise.resolve(makeRow({ isGlobal: true, hotelId: null, status: 'approved' })),
        }),
        fakeRelay(),
      );
      await expect(service.remove(ctx(), TEMPLATE_ID)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('resubmit', () => {
    it('should 422 WA_TEMPLATE_NOT_REJECTED when status != rejected', async () => {
      const service = new WaTemplatesService(
        fakeRepo({ findById: () => Promise.resolve(makeRow({ status: 'pending' })) }),
        fakeRelay(),
      );
      try {
        await service.resubmit(ctx(), TEMPLATE_ID);
        throw new Error('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(BusinessRuleError);
        expect((err as BusinessRuleError).details.rule).toBe('WA_TEMPLATE_NOT_REJECTED');
      }
    });

    it('should flip pending + clear rejection_reason and relay(intent=resubmit)', async () => {
      const update = jest
        .fn<WaTemplatesRepository['update']>()
        .mockResolvedValue(makeRow({ status: 'pending', rejectionReason: null }));
      const relay = jest
        .fn<(input: IntegrationRelaySubmitInput) => Promise<IntegrationRelayResult>>()
        .mockResolvedValue(relayResult());
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () =>
            Promise.resolve(makeRow({ status: 'rejected', rejectionReason: 'bad copy' })),
          update,
        }),
        fakeRelay(relay),
      );
      await service.resubmit(ctx(), TEMPLATE_ID);
      // Explicit null on rejectionReason (not just omission) per PM ACK note.
      expect(update).toHaveBeenCalledWith(TEMPLATE_ID, {
        status: 'pending',
        rejectionReason: null,
      });
      expect(relay).toHaveBeenCalledWith(expect.objectContaining({ intent: 'resubmit' }));
    });

    it('should 403 on global resubmit', async () => {
      const service = new WaTemplatesService(
        fakeRepo({
          findById: () =>
            Promise.resolve(makeRow({ isGlobal: true, hotelId: null, status: 'rejected' })),
        }),
        fakeRelay(),
      );
      await expect(service.resubmit(ctx(), TEMPLATE_ID)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
