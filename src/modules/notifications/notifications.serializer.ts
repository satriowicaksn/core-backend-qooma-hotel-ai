// Serializer layer: snake_case wire shaping. No PII masking — notifications are
// the requester's own (§1.6 field set incl. hotel_id/user_id).

import type { NotificationRow, NotificationWire } from './notifications.types.js';

export function serializeNotification(row: NotificationRow): NotificationWire {
  return {
    id: row.id,
    hotel_id: row.hotelId,
    user_id: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    metadata: row.metadata,
    is_read: row.isRead,
    read_at: row.readAt ? row.readAt.toISOString() : null,
    created_at: row.createdAt.toISOString(),
  };
}
