/**
 * Hotel Core dev seed (T05).
 *
 * S2 (runtime Prisma upsert) per silent-ratification of PARENT §10 T05 coord Q.
 * PM B silent-ratification pending — Nathan welcome to review / comment / override
 * at SUBMIT stage or in any future PR; zero breakage risk (dev-only script).
 *
 * Content: 1 hotel + 5 departments (CON / HSK / FNB / ENG / FO) + 3 menu
 * categories (Breakfast / Lunch / Beverages) + 10 menu items + 6 knowledge
 * entries. Codes `HSK` + `FO` deliberately align with Nathan's testcontainer
 * fixture codes (`tickets.repository.integration.test.ts:73-74`) as a
 * future-friction reducer; other codes are Slot A choices.
 *
 * Design:
 * - Own PrismaClient (NOT `@core/prisma/prisma-client`) — seed only needs
 *   DATABASE_URL; singleton fails fast on unrelated secret env vars.
 * - Deterministic UUIDs → idempotent re-runs. Distinct prefix per model
 *   (d.../ca.../11.../ee...) chosen to be visually distinct from Nathan's
 *   `aaaa/bbbb/1111/2222` testcontainer patterns. Zero collision:
 *   Nathan's fixtures live in ephemeral testcontainer Postgres; this seed
 *   lands in the shared `hotel_core_dev` Opsi C database.
 * - `upsert({ where:{id}, create:{...}, update:{} })` on every operation:
 *   re-runs are no-ops, preserving any manual dev tweaks.
 *
 * Run: `pnpm seed` (via `tsx prisma/seeds/index.ts`) or `make db-seed`.
 * Env: `SEED_HOTEL_ID` optional; default `00000000-0000-4000-8000-000000000001`.
 */

import { PrismaClient } from '@prisma/client';

const HOTEL_ID = process.env.SEED_HOTEL_ID ?? '00000000-0000-4000-8000-000000000001';

const DEPT_IDS = {
  concierge: 'd0000000-0000-4000-8000-000000000001',
  housekeeping: 'd0000000-0000-4000-8000-000000000002',
  fnb: 'd0000000-0000-4000-8000-000000000003',
  engineering: 'd0000000-0000-4000-8000-000000000004',
  frontOffice: 'd0000000-0000-4000-8000-000000000005',
} as const;

const CATEGORY_IDS = {
  breakfast: 'ca000000-0000-4000-8000-000000000001',
  lunch: 'ca000000-0000-4000-8000-000000000002',
  beverages: 'ca000000-0000-4000-8000-000000000003',
} as const;

const departments: ReadonlyArray<{ id: string; name: string; code: string }> = [
  { id: DEPT_IDS.concierge, name: 'Concierge', code: 'CON' },
  { id: DEPT_IDS.housekeeping, name: 'Housekeeping', code: 'HSK' },
  { id: DEPT_IDS.fnb, name: 'Food & Beverage', code: 'FNB' },
  { id: DEPT_IDS.engineering, name: 'Engineering', code: 'ENG' },
  { id: DEPT_IDS.frontOffice, name: 'Front Office', code: 'FO' },
];

const categories: ReadonlyArray<{ id: string; name: string; sortOrder: number }> = [
  { id: CATEGORY_IDS.breakfast, name: 'Breakfast', sortOrder: 0 },
  { id: CATEGORY_IDS.lunch, name: 'Lunch', sortOrder: 1 },
  { id: CATEGORY_IDS.beverages, name: 'Beverages', sortOrder: 2 },
];

const menuItems: ReadonlyArray<{
  id: string;
  categoryId: string;
  name: string;
  priceIdr: number;
}> = [
  {
    id: '11000000-0000-4000-8000-000000000001',
    categoryId: CATEGORY_IDS.breakfast,
    name: 'Nasi Goreng',
    priceIdr: 45000,
  },
  {
    id: '11000000-0000-4000-8000-000000000002',
    categoryId: CATEGORY_IDS.breakfast,
    name: 'Bubur Ayam',
    priceIdr: 35000,
  },
  {
    id: '11000000-0000-4000-8000-000000000003',
    categoryId: CATEGORY_IDS.breakfast,
    name: 'Pancakes',
    priceIdr: 55000,
  },
  {
    id: '11000000-0000-4000-8000-000000000004',
    categoryId: CATEGORY_IDS.lunch,
    name: 'Ayam Bakar',
    priceIdr: 85000,
  },
  {
    id: '11000000-0000-4000-8000-000000000005',
    categoryId: CATEGORY_IDS.lunch,
    name: 'Ikan Kakap',
    priceIdr: 120000,
  },
  {
    id: '11000000-0000-4000-8000-000000000006',
    categoryId: CATEGORY_IDS.lunch,
    name: 'Sate Ayam',
    priceIdr: 65000,
  },
  {
    id: '11000000-0000-4000-8000-000000000007',
    categoryId: CATEGORY_IDS.lunch,
    name: 'Vegetarian Bowl',
    priceIdr: 60000,
  },
  {
    id: '11000000-0000-4000-8000-000000000008',
    categoryId: CATEGORY_IDS.beverages,
    name: 'Kopi Tubruk',
    priceIdr: 25000,
  },
  {
    id: '11000000-0000-4000-8000-000000000009',
    categoryId: CATEGORY_IDS.beverages,
    name: 'Es Teh',
    priceIdr: 15000,
  },
  {
    id: '11000000-0000-4000-8000-00000000000a',
    categoryId: CATEGORY_IDS.beverages,
    name: 'Fresh Juice',
    priceIdr: 35000,
  },
];

const knowledgeEntries: ReadonlyArray<{
  id: string;
  title: string;
  content: string;
  category: string;
  tags: readonly string[];
}> = [
  {
    id: 'ee000000-0000-4000-8000-000000000001',
    title: 'Check-in / check-out hours',
    content:
      'Standard check-in is 14:00, standard check-out is 12:00. Early check-in and late check-out subject to availability.',
    category: 'policy',
    tags: ['front-office', 'policy'],
  },
  {
    id: 'ee000000-0000-4000-8000-000000000002',
    title: 'Late check-out charges',
    content:
      'Check-out between 12:00–18:00 incurs a 50% day-rate charge. After 18:00 is charged as a full additional night.',
    category: 'policy',
    tags: ['billing', 'front-office'],
  },
  {
    id: 'ee000000-0000-4000-8000-000000000003',
    title: 'Wi-Fi password location',
    content:
      'The Wi-Fi network name and password are printed on the welcome card inside each room, next to the key card sleeve.',
    category: 'guest-service',
    tags: ['guest-service'],
  },
  {
    id: 'ee000000-0000-4000-8000-000000000004',
    title: 'Room service ordering hours',
    content:
      'Room service is available 06:00–23:00 daily. Orders placed after 22:30 may take up to 45 minutes to prepare.',
    category: 'policy',
    tags: ['f-and-b', 'room-service'],
  },
  {
    id: 'ee000000-0000-4000-8000-000000000005',
    title: 'Housekeeping request procedure',
    content:
      'Extra towels, pillows, or amenities can be requested via the room phone (dial 0) or through the messaging system.',
    category: 'guest-service',
    tags: ['housekeeping'],
  },
  {
    id: 'ee000000-0000-4000-8000-000000000006',
    title: 'Emergency contact numbers',
    content:
      'For medical or security emergencies dial 9 from any room phone. Front desk (24-hour) is reachable at 0.',
    category: 'safety',
    tags: ['safety', 'emergency'],
  },
];

const db = new PrismaClient();

async function main(): Promise<void> {
  await db.hotel.upsert({
    where: { id: HOTEL_ID },
    create: { id: HOTEL_ID },
    update: {},
  });

  for (const dept of departments) {
    await db.department.upsert({
      where: { id: dept.id },
      create: {
        id: dept.id,
        hotelId: HOTEL_ID,
        name: dept.name,
        code: dept.code,
      },
      update: {},
    });
  }

  for (const category of categories) {
    await db.menuCategory.upsert({
      where: { id: category.id },
      create: {
        id: category.id,
        hotelId: HOTEL_ID,
        name: category.name,
        sortOrder: category.sortOrder,
      },
      update: {},
    });
  }

  for (const item of menuItems) {
    await db.menuItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        hotelId: HOTEL_ID,
        categoryId: item.categoryId,
        name: item.name,
        priceIdr: item.priceIdr,
      },
      update: {},
    });
  }

  for (const entry of knowledgeEntries) {
    await db.knowledgeEntry.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        hotelId: HOTEL_ID,
        title: entry.title,
        content: entry.content,
        category: entry.category,
        tags: [...entry.tags],
      },
      update: {},
    });
  }

  // ADD-24: explicit defaults row for the demo hotel (absent row = same
  // defaults at runtime; seeded so /settings/otp edits have a base row).
  await db.hotelOtpSettings.upsert({
    where: { hotelId: HOTEL_ID },
    create: { hotelId: HOTEL_ID },
    update: {},
  });

  console.warn(
    `✓ Seed complete: hotel ${HOTEL_ID}, ${departments.length} depts, ${categories.length} categories, ${menuItems.length} items, ${knowledgeEntries.length} KB entries, otp settings`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
