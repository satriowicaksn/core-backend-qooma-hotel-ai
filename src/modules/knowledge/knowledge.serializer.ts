// Serializer: Prisma row (camelCase) → wire DTO (snake_case). One-way, at the
// route boundary only. `tags` pass-through — Prisma guarantees String[] shape.

import type { KnowledgeEntryRow, KnowledgeEntryWire } from './knowledge.types.js';

export function serializeKnowledgeEntry(row: KnowledgeEntryRow): KnowledgeEntryWire {
  return {
    id: row.id,
    hotel_id: row.hotelId,
    title: row.title,
    content: row.content,
    category: row.category,
    tags: row.tags,
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
