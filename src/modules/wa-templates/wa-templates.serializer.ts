// Serializer: Prisma row (camelCase) → wire DTO (snake_case). One-way, at the
// route boundary only.

import type { WaTemplateRow, WaTemplateStatus, WaTemplateWire } from './wa-templates.types.js';

export function serializeWaTemplate(row: WaTemplateRow): WaTemplateWire {
  // variables is stored as JSONB; DB CHECK not present but zod at boundary
  // enforces string[]. Any non-string entries surviving here would be a
  // dev-only anomaly (e.g. manual DB insert) — narrow defensively.
  const variables = Array.isArray(row.variables)
    ? row.variables.filter((v): v is string => typeof v === 'string')
    : [];
  return {
    id: row.id,
    hotel_id: row.hotelId,
    name: row.name,
    body: row.body,
    variables,
    language: row.language,
    status: row.status as WaTemplateStatus,
    template_id_meta: row.templateIdMeta,
    rejection_reason: row.rejectionReason,
    is_global: row.isGlobal,
    approved_at: row.approvedAt ? row.approvedAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
