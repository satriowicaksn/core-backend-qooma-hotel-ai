import { describe, expect, it, jest } from '@jest/globals';

import { BusinessRuleError, ValidationError } from '@core/errors/app-errors.js';

import type { TenantContext } from '@plugins/tenant-guard.js';

import type { VoiceRepository } from '../voice.repository.js';
import { parseUpsertVoiceBody, parseVoiceTestBody } from '../voice.schema.js';
import { emptyVoiceConfig, serializeVoiceConfig } from '../voice.serializer.js';
import { VoiceService } from '../voice.service.js';
import type { VoiceConfigRow } from '../voice.types.js';

const HOTEL_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const TEST_PAYLOAD = {
  pbx_host: 'sip.example.com',
  sip_username: 'user',
  sip_password: 'pass',
  sip_port: 5060,
};

function ctx(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    userId: USER_ID,
    hotelId: HOTEL_A,
    isSuperAdmin: false,
    role: 'gm_admin',
    ...overrides,
  };
}

function makeRow(overrides: Partial<VoiceConfigRow> = {}): VoiceConfigRow {
  return {
    hotelId: HOTEL_A,
    pbxType: 'sip',
    config: { host: 'sip.example.com' },
    isActive: true,
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    ...overrides,
  };
}

function fakeRepo(overrides: Partial<VoiceRepository> = {}): VoiceRepository {
  return {
    findByHotel: () => Promise.resolve(null),
    upsert: (hotelId: string) => Promise.resolve(makeRow({ hotelId })),
    ...overrides,
  } as unknown as VoiceRepository;
}

describe('zod parser (UpsertVoiceBodySchema)', () => {
  it('should accept a body with pbx_type only', () => {
    expect(parseUpsertVoiceBody({ pbx_type: 'sip' })).toEqual({ pbx_type: 'sip' });
  });

  it('should accept pbx_type=null (partial-clear)', () => {
    expect(parseUpsertVoiceBody({ pbx_type: null })).toEqual({ pbx_type: null });
  });

  it('should accept a full body', () => {
    expect(
      parseUpsertVoiceBody({ pbx_type: 'twilio', config: { region: 'sg' }, is_active: true }),
    ).toEqual({ pbx_type: 'twilio', config: { region: 'sg' }, is_active: true });
  });

  it('should reject an empty body (refine non-empty)', () => {
    expect(() => parseUpsertVoiceBody({})).toThrow(ValidationError);
  });

  it('should reject an unknown field (strict — hotel_id belt-and-suspenders)', () => {
    expect(() => parseUpsertVoiceBody({ pbx_type: 'sip', hotel_id: 'attacker' })).toThrow(
      ValidationError,
    );
  });

  it('should reject pbx_type over 40 chars (VARCHAR mirror)', () => {
    const long = 'x'.repeat(41);
    expect(() => parseUpsertVoiceBody({ pbx_type: long })).toThrow(ValidationError);
  });

  it('should reject empty-string pbx_type', () => {
    expect(() => parseUpsertVoiceBody({ pbx_type: '' })).toThrow(ValidationError);
  });

  it('should accept the flat FE VoiceSettings SIP fields', () => {
    const body = {
      pbx_type: 'cloud_pbx',
      pbx_host: 'sip.example.com',
      sip_username: 'user',
      sip_password: 'pass',
      sip_port: 5060,
      sip_codec: 'opus' as const,
      did_number: '+15551234',
    };
    expect(parseUpsertVoiceBody(body)).toEqual(body);
  });

  it('should reject an out-of-range sip_port', () => {
    expect(() => parseUpsertVoiceBody({ sip_port: 70000 })).toThrow(ValidationError);
  });

  it('should reject an unknown sip_codec', () => {
    expect(() => parseUpsertVoiceBody({ sip_codec: 'mp3' })).toThrow(ValidationError);
  });
});

describe('zod parser (VoiceTestBodySchema)', () => {
  it('should accept a full VoiceTestPayload', () => {
    expect(parseVoiceTestBody(TEST_PAYLOAD)).toEqual(TEST_PAYLOAD);
  });

  it('should reject a body missing sip_port', () => {
    const { sip_port: _omit, ...partial } = TEST_PAYLOAD;
    expect(() => parseVoiceTestBody(partial)).toThrow(ValidationError);
  });

  it('should reject an unknown field (strict)', () => {
    expect(() => parseVoiceTestBody({ ...TEST_PAYLOAD, extra: 1 })).toThrow(ValidationError);
  });
});

describe('serializer', () => {
  it('should snake_case a row and surface flat SIP fields from config', () => {
    const wire = serializeVoiceConfig(
      makeRow({
        config: {
          pbx_host: 'sip.example.com',
          sip_username: 'user',
          sip_password: 'pass',
          sip_port: 5060,
          sip_codec: 'opus',
          did_number: '+15551234',
        },
      }),
    );
    expect(wire).toEqual({
      hotel_id: HOTEL_A,
      pbx_type: 'sip',
      pbx_host: 'sip.example.com',
      sip_username: 'user',
      sip_password: 'pass',
      sip_port: 5060,
      sip_codec: 'opus',
      did_number: '+15551234',
      config: {
        pbx_host: 'sip.example.com',
        sip_username: 'user',
        sip_password: 'pass',
        sip_port: 5060,
        sip_codec: 'opus',
        did_number: '+15551234',
      },
      is_active: true,
      updated_at: '2026-07-03T00:00:00.000Z',
    });
  });

  it('should default flat SIP fields when config lacks them', () => {
    const wire = serializeVoiceConfig(makeRow({ config: { host: 'sip.example.com' } }));
    expect(wire.pbx_host).toBe('');
    expect(wire.sip_port).toBe(0);
    expect(wire.sip_codec).toBe('g711a');
    expect(wire.config).toEqual({ host: 'sip.example.com' });
  });

  it('should defensively narrow non-object config to {}', () => {
    const wire = serializeVoiceConfig(
      makeRow({ config: 'garbage' as unknown as Record<string, unknown> }),
    );
    expect(wire.config).toEqual({});
  });

  it('emptyVoiceConfig should carry the caller hotel_id with null updated_at', () => {
    expect(emptyVoiceConfig(HOTEL_A)).toEqual({
      hotel_id: HOTEL_A,
      pbx_type: null,
      pbx_host: '',
      sip_username: '',
      sip_password: '',
      sip_port: 0,
      sip_codec: 'g711a',
      did_number: '',
      config: {},
      is_active: false,
      updated_at: null,
    });
  });
});

describe('VoiceService.get', () => {
  it('should return empty default when no row exists (never 404)', async () => {
    const service = new VoiceService(fakeRepo({ findByHotel: () => Promise.resolve(null) }));
    const res = await service.get(ctx());
    expect(res.data).toEqual({
      hotel_id: HOTEL_A,
      pbx_type: null,
      pbx_host: '',
      sip_username: '',
      sip_password: '',
      sip_port: 0,
      sip_codec: 'g711a',
      did_number: '',
      config: {},
      is_active: false,
      updated_at: null,
    });
  });

  it('should return the persisted row when present', async () => {
    const service = new VoiceService(
      fakeRepo({ findByHotel: () => Promise.resolve(makeRow({ pbxType: 'twilio' })) }),
    );
    const res = await service.get(ctx());
    expect(res.data.pbx_type).toBe('twilio');
    expect(res.data.hotel_id).toBe(HOTEL_A);
  });
});

describe('VoiceService.upsert', () => {
  it('should call repo.upsert with ctx.hotelId and delta shape', async () => {
    const upsert = jest
      .fn<VoiceRepository['upsert']>()
      .mockResolvedValue(makeRow({ pbxType: 'twilio' }));
    const service = new VoiceService(fakeRepo({ upsert }));
    await service.upsert(ctx(), { pbx_type: 'twilio' });
    expect(upsert).toHaveBeenCalledWith(HOTEL_A, expect.objectContaining({ pbxType: 'twilio' }));
  });

  it('should convert snake_case body to camelCase delta', async () => {
    const upsert = jest
      .fn<VoiceRepository['upsert']>()
      .mockResolvedValue(makeRow({ isActive: true, config: { k: 'v' } }));
    const service = new VoiceService(fakeRepo({ upsert }));
    await service.upsert(ctx(), { is_active: true, config: { k: 'v' } });
    expect(upsert).toHaveBeenCalledWith(
      HOTEL_A,
      expect.objectContaining({ isActive: true, config: { k: 'v' } }),
    );
  });

  it('should skip fields absent from body (partial-update)', async () => {
    const upsert = jest.fn<VoiceRepository['upsert']>().mockResolvedValue(makeRow());
    const service = new VoiceService(fakeRepo({ upsert }));
    await service.upsert(ctx(), { pbx_type: 'sip' });
    const delta = upsert.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(delta).toHaveProperty('pbxType');
    expect(delta).not.toHaveProperty('isActive');
    expect(delta).not.toHaveProperty('config');
  });

  it('should propagate the fresh row from repo as snake_case wire', async () => {
    const service = new VoiceService(
      fakeRepo({ upsert: () => Promise.resolve(makeRow({ pbxType: 'twilio', isActive: true })) }),
    );
    const res = await service.upsert(ctx(), { pbx_type: 'twilio' });
    expect(res.data.pbx_type).toBe('twilio');
    expect(res.data.is_active).toBe(true);
  });

  it('should fold flat SIP fields into the config delta', async () => {
    const upsert = jest.fn<VoiceRepository['upsert']>().mockResolvedValue(makeRow());
    const service = new VoiceService(fakeRepo({ upsert }));
    await service.upsert(ctx(), {
      pbx_type: 'cloud_pbx',
      pbx_host: 'sip.example.com',
      sip_username: 'user',
      sip_password: 'pass',
      sip_port: 5060,
      sip_codec: 'opus',
      did_number: '+15551234',
    });
    expect(upsert).toHaveBeenCalledWith(
      HOTEL_A,
      expect.objectContaining({
        pbxType: 'cloud_pbx',
        config: {
          pbx_host: 'sip.example.com',
          sip_username: 'user',
          sip_password: 'pass',
          sip_port: 5060,
          sip_codec: 'opus',
          did_number: '+15551234',
        },
      }),
    );
  });

  it('should merge flat SIP fields over an explicit config blob (flat wins)', async () => {
    const upsert = jest.fn<VoiceRepository['upsert']>().mockResolvedValue(makeRow());
    const service = new VoiceService(fakeRepo({ upsert }));
    await service.upsert(ctx(), {
      config: { pbx_host: 'old.example.com', region: 'sg' },
      pbx_host: 'new.example.com',
    });
    expect(upsert).toHaveBeenCalledWith(
      HOTEL_A,
      expect.objectContaining({
        config: { region: 'sg', pbx_host: 'new.example.com' },
      }),
    );
  });

  it('should support clearing pbx_type to null via body', async () => {
    const upsert = jest
      .fn<VoiceRepository['upsert']>()
      .mockResolvedValue(makeRow({ pbxType: null }));
    const service = new VoiceService(fakeRepo({ upsert }));
    await service.upsert(ctx(), { pbx_type: null });
    expect(upsert).toHaveBeenCalledWith(HOTEL_A, expect.objectContaining({ pbxType: null }));
  });
});

describe('VoiceService.test — Q-T29-#3 precondition guard', () => {
  it('should 422 VOICE_NOT_CONFIGURED when no row exists', async () => {
    const service = new VoiceService(fakeRepo({ findByHotel: () => Promise.resolve(null) }));
    try {
      await service.test(ctx(), TEST_PAYLOAD);
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BusinessRuleError);
      expect((err as BusinessRuleError).details.rule).toBe('VOICE_NOT_CONFIGURED');
    }
  });

  it('should 422 VOICE_NOT_CONFIGURED when row exists but pbx_type is null', async () => {
    const service = new VoiceService(
      fakeRepo({ findByHotel: () => Promise.resolve(makeRow({ pbxType: null })) }),
    );
    await expect(service.test(ctx(), TEST_PAYLOAD)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('should return the flat stub success wire when pbx_type is set', async () => {
    const service = new VoiceService(
      fakeRepo({ findByHotel: () => Promise.resolve(makeRow({ pbxType: 'sip' })) }),
    );
    const res = await service.test(ctx(), TEST_PAYLOAD);
    expect(res.data.success).toBe(true);
    expect(res.data.message).toContain('wave 2a');
    expect(res.data.note).toContain('wave 2a');
  });
});
