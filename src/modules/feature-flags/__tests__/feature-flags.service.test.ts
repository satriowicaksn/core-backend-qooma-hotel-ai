import { describe, expect, it, jest } from '@jest/globals';

import { ValidationError } from '@core/errors/app-errors.js';
import type { Logger } from '@core/logger/logger.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import { KNOWN_FLAGS } from '../feature-flags.constants.js';
import type { FeatureFlagsRepository } from '../feature-flags.repository.js';
import { parseFlagParam, parsePatchQuery, parseUpdateFlagBody } from '../feature-flags.schema.js';
import { composeFlagList, serializeFlagRow } from '../feature-flags.serializer.js';
import { FeatureFlagsService } from '../feature-flags.service.js';
import type { FeatureFlagRow } from '../feature-flags.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
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

function makeRow(overrides: Partial<FeatureFlagRow> = {}): FeatureFlagRow {
  return {
    id: 'ff-1',
    hotelId: HOTEL_A,
    flag: 'multi_language',
    isEnabled: true,
    config: {},
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedBy: null,
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<FeatureFlagsRepository> = {}): FeatureFlagsRepository {
  return {
    findManyByHotel: () => Promise.resolve([]),
    upsertFlag: () => Promise.resolve(makeRow()),
    ...overrides,
  } as unknown as FeatureFlagsRepository;
}

function svc(
  repo: FeatureFlagsRepository,
  overrides: { skipCrossDbChecks?: boolean; nodeEnv?: string; logger?: Logger } = {},
): FeatureFlagsService {
  return new FeatureFlagsService(repo, {
    skipCrossDbChecks: overrides.skipCrossDbChecks ?? true,
    nodeEnv: overrides.nodeEnv ?? 'development',
    ...(overrides.logger ? { logger: overrides.logger } : {}),
  });
}

describe('zod parsers', () => {
  it('should accept a valid update body with is_enabled', () => {
    expect(parseUpdateFlagBody({ is_enabled: true })).toEqual({ is_enabled: true });
  });

  it('should accept a valid update body with config only', () => {
    expect(parseUpdateFlagBody({ config: { key: 'val' } })).toEqual({
      config: { key: 'val' },
    });
  });

  it('should reject an empty body (refine non-empty)', () => {
    expect(() => parseUpdateFlagBody({})).toThrow(ValidationError);
  });

  it('should reject an unknown field on update (strict)', () => {
    expect(() => parseUpdateFlagBody({ is_enabled: true, hotel_id: 'attacker' })).toThrow(
      ValidationError,
    );
  });

  it('should reject unknown flag name via param schema', () => {
    expect(() => parseFlagParam({ flag: 'not_a_real_flag' })).toThrow(ValidationError);
  });

  it('should accept every KNOWN_FLAG name', () => {
    for (const flag of KNOWN_FLAGS) {
      expect(parseFlagParam({ flag })).toBe(flag);
    }
  });

  it('should parse ?force=true query', () => {
    expect(parsePatchQuery({ force: 'true' })).toEqual({ force: true });
    expect(parsePatchQuery({ force: 'false' })).toEqual({ force: false });
    expect(parsePatchQuery({})).toEqual({});
  });

  it('should reject bogus ?force value', () => {
    expect(() => parsePatchQuery({ force: 'bogus' })).toThrow(ValidationError);
  });
});

describe('serializer', () => {
  it('serializeFlagRow should surface three-state nulls (PM ACK tightenings #2/#3/#4)', () => {
    const wire = serializeFlagRow(makeRow({ isEnabled: true }), 'multi_language');
    expect(wire.is_tier_locked).toBeNull();
    expect(wire.depends_on_active_data).toBeNull();
    expect(wire.min_tier).toBeNull();
    expect(wire.updated_by).toBeNull(); // updatedBy is null per PM ACK #1 default
  });

  it('serializeFlagRow should snake_case + narrow config defensively', () => {
    const wire = serializeFlagRow(
      makeRow({ config: 'garbage' as unknown as Record<string, unknown> }),
      'multi_language',
    );
    expect(wire.config).toEqual({});
  });

  it('composeFlagList should synthesize a wire for every KNOWN_FLAG', () => {
    const list = composeFlagList(HOTEL_A, []);
    expect(list).toHaveLength(KNOWN_FLAGS.length);
    expect(list.every((w) => w.hotel_id === HOTEL_A)).toBe(true);
    // Empty defaults: not enabled, updated_at null, updated_by null.
    expect(list[0]?.is_enabled).toBe(false);
    expect(list[0]?.updated_at).toBeNull();
  });

  it('composeFlagList should use DB row for flags present + default for absent', () => {
    const rows: FeatureFlagRow[] = [
      makeRow({ flag: 'multi_language', isEnabled: true }),
      makeRow({ flag: 'vip_profile', isEnabled: false }),
    ];
    const list = composeFlagList(HOTEL_A, rows);
    const ml = list.find((w) => w.flag === 'multi_language');
    const vp = list.find((w) => w.flag === 'vip_profile');
    const other = list.find((w) => w.flag === 'sentiment_detection');
    expect(ml?.is_enabled).toBe(true);
    expect(vp?.is_enabled).toBe(false);
    expect(other?.is_enabled).toBe(false); // absent → default
    expect(other?.updated_at).toBeNull();
  });
});

describe('FeatureFlagsService.list', () => {
  it('should return all 14 KNOWN_FLAG wires', async () => {
    const service = svc(fakeRepo());
    const res = await service.list(ctx());
    expect(res.data).toHaveLength(KNOWN_FLAGS.length);
  });

  it('should preserve DB row state when present', async () => {
    const service = svc(
      fakeRepo({
        findManyByHotel: () =>
          Promise.resolve([makeRow({ flag: 'menu_ordering', isEnabled: true })]),
      }),
    );
    const res = await service.list(ctx());
    const mo = res.data.find((w) => w.flag === 'menu_ordering');
    expect(mo?.is_enabled).toBe(true);
  });
});

describe('FeatureFlagsService.patch — Opsi C behavior (PM ACK tightening #1)', () => {
  it('should pass updated_by=null under SKIP_CROSS_DB_CHECKS=true', async () => {
    const upsert = jest.fn<FeatureFlagsRepository['upsertFlag']>().mockResolvedValue(makeRow());
    const service = svc(fakeRepo({ upsertFlag: upsert }), { skipCrossDbChecks: true });
    await service.patch(ctx(), 'multi_language', { is_enabled: true });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ updatedBy: null, hotelId: HOTEL_A }),
    );
  });

  it('should pass updated_by=ctx.userId when flag=false (post-Opsi-A path)', async () => {
    const upsert = jest.fn<FeatureFlagsRepository['upsertFlag']>().mockResolvedValue(makeRow());
    const service = svc(fakeRepo({ upsertFlag: upsert }), { skipCrossDbChecks: false });
    await service.patch(ctx(), 'multi_language', { is_enabled: true });
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ updatedBy: USER_ID }));
  });

  it('should forward is_enabled + config delta to repo', async () => {
    const upsert = jest.fn<FeatureFlagsRepository['upsertFlag']>().mockResolvedValue(makeRow());
    const service = svc(fakeRepo({ upsertFlag: upsert }));
    await service.patch(ctx(), 'multi_language', {
      is_enabled: false,
      config: { threshold: 0.8 },
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ isEnabled: false, config: { threshold: 0.8 } }),
    );
  });

  it('should skip omitted keys (partial-update contract)', async () => {
    const upsert = jest.fn<FeatureFlagsRepository['upsertFlag']>().mockResolvedValue(makeRow());
    const service = svc(fakeRepo({ upsertFlag: upsert }));
    await service.patch(ctx(), 'multi_language', { is_enabled: true });
    const call = upsert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call).toHaveProperty('isEnabled');
    expect(call).not.toHaveProperty('config');
  });

  it('should return snake_case wire with three-state nulls preserved', async () => {
    const service = svc(
      fakeRepo({ upsertFlag: () => Promise.resolve(makeRow({ isEnabled: true })) }),
    );
    const res = await service.patch(ctx(), 'multi_language', { is_enabled: true });
    expect(res.data.is_enabled).toBe(true);
    expect(res.data.is_tier_locked).toBeNull();
    expect(res.data.depends_on_active_data).toBeNull();
    expect(res.data.min_tier).toBeNull();
  });
});

describe('FeatureFlagsService — Q-C-02 WARN', () => {
  it('should WARN once on prod + flag=true', () => {
    const warn = jest.fn();
    const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
    svc(fakeRepo(), { skipCrossDbChecks: true, nodeEnv: 'production', logger });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'feature-flags',
        event: 'cross_db_check_skip',
        env: 'production',
      }),
    );
  });

  it('should NOT WARN on development + flag=true', () => {
    const warn = jest.fn();
    const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
    svc(fakeRepo(), { skipCrossDbChecks: true, nodeEnv: 'development', logger });
    expect(warn).not.toHaveBeenCalled();
  });

  it('should NOT WARN when flag=false', () => {
    const warn = jest.fn();
    const logger: Logger = { debug: jest.fn(), info: jest.fn(), warn, error: jest.fn() };
    svc(fakeRepo(), { skipCrossDbChecks: false, nodeEnv: 'production', logger });
    expect(warn).not.toHaveBeenCalled();
  });
});
