// Public API of the notifications module. Internal units stay unexported —
// bootstrap wires via buildNotificationsService.

import type { PrismaClient } from '@prisma/client';

import { NotificationsRepository } from './notifications.repository.js';
import { NotificationsService } from './notifications.service.js';

export { notificationsRoutes, type NotificationsRoutesOptions } from './notifications.routes.js';
export { NotificationsService } from './notifications.service.js';
export type {
  MarkAllResponse,
  NotificationListResponse,
  NotificationResponse,
  NotificationWire,
  UnreadCountResponse,
} from './notifications.types.js';

export function buildNotificationsService(db: PrismaClient): NotificationsService {
  return new NotificationsService(new NotificationsRepository(db));
}
