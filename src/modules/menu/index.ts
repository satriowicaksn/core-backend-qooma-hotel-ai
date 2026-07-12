// Public API of the menu module. Internal units stay unexported —
// bootstrap wires via buildMenuService.

import type { PrismaClient } from '@prisma/client';

import type { ObjectStoragePort } from '@core/storage/object-storage.port.js';

import { MenuRepository } from './menu.repository.js';
import { MenuService } from './menu.service.js';

export { menuRoutes, type MenuRoutesOptions } from './menu.routes.js';
export { MenuService } from './menu.service.js';
export type {
  BulkAvailabilityBody,
  CreateCategoryBody,
  CreateItemBody,
  UpdateCategoryBody,
  UpdateItemBody,
} from './menu.schema.js';
export type {
  BulkAvailabilityResponse,
  BulkAvailabilityResult,
  BulkAvailabilitySkippedItem,
  MenuCategoryResponse,
  MenuCategoryWire,
  MenuItemResponse,
  MenuItemWire,
  MenuListResponse,
} from './menu.types.js';

export function buildMenuService(db: PrismaClient, storage: ObjectStoragePort): MenuService {
  return new MenuService(new MenuRepository(db), storage);
}
