// Repository: Prisma direct (no interface — ADR-0001).
// countItemsInCategory + ensureCategoryBelongsToHotel use .count() per PM ACK
// coding note (cheaper + no memory pressure).

import type { Prisma, PrismaClient } from '@prisma/client';

import type { MenuCategoryRow, MenuCategoryWithItemsRow, MenuItemRow } from './menu.types.js';

export class MenuRepository {
  constructor(private readonly db: PrismaClient) {}

  async listCategoriesWithItems(
    where: Prisma.MenuCategoryWhereInput,
  ): Promise<MenuCategoryWithItemsRow[]> {
    return this.db.menuCategory.findMany({
      where,
      include: { items: { orderBy: [{ name: 'asc' }] } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findCategoryById(id: string): Promise<MenuCategoryRow | null> {
    return this.db.menuCategory.findUnique({ where: { id } });
  }

  async createCategory(data: Prisma.MenuCategoryUncheckedCreateInput): Promise<MenuCategoryRow> {
    return this.db.menuCategory.create({ data });
  }

  async updateCategory(
    id: string,
    data: Prisma.MenuCategoryUncheckedUpdateInput,
  ): Promise<MenuCategoryRow> {
    return this.db.menuCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.db.menuCategory.delete({ where: { id } });
  }

  async countItemsInCategory(categoryId: string): Promise<number> {
    return this.db.menuItem.count({ where: { categoryId } });
  }

  async ensureCategoryBelongsToHotel(categoryId: string, hotelId: string): Promise<boolean> {
    const count = await this.db.menuCategory.count({
      where: { id: categoryId, hotelId },
    });
    return count > 0;
  }

  async findItemById(id: string): Promise<MenuItemRow | null> {
    return this.db.menuItem.findUnique({ where: { id } });
  }

  async createItem(data: Prisma.MenuItemUncheckedCreateInput): Promise<MenuItemRow> {
    return this.db.menuItem.create({ data });
  }

  async updateItem(id: string, data: Prisma.MenuItemUncheckedUpdateInput): Promise<MenuItemRow> {
    return this.db.menuItem.update({ where: { id }, data });
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.menuItem.delete({ where: { id } });
  }
}
