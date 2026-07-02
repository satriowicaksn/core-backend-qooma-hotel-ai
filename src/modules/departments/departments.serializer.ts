// Serializer: Prisma row (camelCase) → wire DTO (snake_case). One-way, at the
// route boundary only.

import type {
  DepartmentRow,
  DepartmentWire,
  EscalationChain,
  OperatingHours,
} from './departments.types.js';

export function serializeDepartment(row: DepartmentRow): DepartmentWire {
  return {
    id: row.id,
    hotel_id: row.hotelId,
    name: row.name,
    code: row.code,
    operating_hours: row.operatingHours as OperatingHours,
    escalation_chain: row.escalationChain as EscalationChain | Record<string, never>,
    telegram_chat_id: row.telegramChatId,
    supervisor_telegram_id: row.supervisorTelegramId,
    is_active: row.isActive,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}
