// Service: tenant scope + search + offset pagination + serialization.
// Consumes T03's TenantContext seam; Prisma access via the repository.
// gm_admin-only surface (RBAC gate is T04's preHandler — we scope data only, N3).

import type { Prisma } from '@prisma/client';

import { NotFoundError } from '@core/errors/app-errors.js';

import { assertHotelOwnership, type TenantContext } from '@plugins/tenant-guard.js';

import type { GuestsRepository } from './guests.repository.js';
import { parseGuestListQuery, parseGuestUpdate, parsePreferenceInput } from './guests.schema.js';
import { serializeGuest, serializeGuestDetail, serializePreference } from './guests.serializer.js';
import type {
  GuestDetailResponse,
  GuestListQuery,
  GuestListResponse,
  GuestResponse,
  GuestUpdate,
  PreferencesResponse,
} from './guests.types.js';

// Explicit super_admin bypass; guests are not dept-scoped (gm_admin-only).
export function buildGuestListWhere(
  ctx: TenantContext,
  query: GuestListQuery,
): Prisma.GuestWhereInput {
  const and: Prisma.GuestWhereInput[] = [];
  if (!ctx.isSuperAdmin) {
    and.push({ hotelId: ctx.hotelId });
  }
  if (query.q) {
    and.push({
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { waPhone: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }
  return and.length > 0 ? { AND: and } : {};
}

function toGuestUpdateData(update: GuestUpdate): Prisma.GuestUpdateInput {
  return {
    ...(update.name !== undefined ? { name: update.name } : {}),
    ...(update.email !== undefined ? { email: update.email } : {}),
    ...(update.privacyMode !== undefined ? { privacyMode: update.privacyMode } : {}),
    ...(update.isVip !== undefined ? { isVip: update.isVip } : {}),
    ...(update.vipLevel !== undefined ? { vipLevel: update.vipLevel } : {}),
  };
}

export class GuestsService {
  constructor(private readonly repo: GuestsRepository) {}

  async list(ctx: TenantContext, rawQuery: unknown): Promise<GuestListResponse> {
    const query = parseGuestListQuery(rawQuery);
    const where = buildGuestListWhere(ctx, query);
    const skip = (query.page - 1) * query.pageSize;
    const { rows, total } = await this.repo.findManyAndCount(where, skip, query.pageSize);
    const data = rows.map((r) => serializeGuest(r, ctx));
    return {
      data,
      pageInfo: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        hasMore: query.page * query.pageSize < total,
      },
    };
  }

  async detail(ctx: TenantContext, id: string): Promise<GuestDetailResponse> {
    const row = await this.repo.findDetailById(id);
    if (!row) {
      throw new NotFoundError('Guest', id);
    }
    assertHotelOwnership(ctx, row.hotelId, 'Guest');
    return { data: serializeGuestDetail(row, ctx) };
  }

  async update(ctx: TenantContext, id: string, rawBody: unknown): Promise<GuestResponse> {
    const update = parseGuestUpdate(rawBody);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Guest', id);
    }
    assertHotelOwnership(ctx, existing.hotelId, 'Guest');
    const updated = await this.repo.updateGuest(id, toGuestUpdateData(update));
    return { data: serializeGuest(updated, ctx) };
  }

  async addPreference(
    ctx: TenantContext,
    id: string,
    rawBody: unknown,
  ): Promise<PreferencesResponse> {
    const input = parsePreferenceInput(rawBody);
    const guest = await this.repo.findById(id);
    if (!guest) {
      throw new NotFoundError('Guest', id);
    }
    assertHotelOwnership(ctx, guest.hotelId, 'Guest');
    const prefs = await this.repo.upsertPreferenceAndList(
      id,
      guest.hotelId,
      input.preferenceType,
      input.preferenceValue,
    );
    return { data: prefs.map((p) => serializePreference(p)) };
  }
}
