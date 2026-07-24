import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import { makeInternalAuthPreHandler } from '@plugins/internal-auth.js';

const BootstrapBodySchema = z.object({
  hotel_id: z.string().uuid(),
});

interface DefaultDept {
  code: string;
  name: string;
}

const DEFAULT_DEPARTMENTS: readonly DefaultDept[] = [
  { code: 'FO', name: 'Front Office' },
  { code: 'HSK', name: 'Housekeeping' },
  { code: 'FNB', name: 'Food & Beverage' },
  { code: 'ENG', name: 'Engineering' },
  { code: 'CON', name: 'Concierge' },
];

export interface HotelBootstrapRoutesOptions {
  readonly db: PrismaClient;
  readonly internalSecret: string | undefined;
}

export const hotelBootstrapRoutes: FastifyPluginCallback<HotelBootstrapRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  fastify.addHook('preHandler', makeInternalAuthPreHandler(opts.internalSecret));

  fastify.post('/hotels/bootstrap', async (req, reply) => {
    const parsed = BootstrapBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('hotel bootstrap body failed validation', {
        issues: parsed.error.issues,
      });
    }
    const { hotel_id: hotelId } = parsed.data;

    await opts.db.hotel.upsert({
      where: { id: hotelId },
      create: { id: hotelId },
      update: {},
    });

    const seeded: string[] = [];
    for (const dept of DEFAULT_DEPARTMENTS) {
      const created = await opts.db.department.upsert({
        where: { hotelId_code: { hotelId, code: dept.code } },
        create: { hotelId, code: dept.code, name: dept.name },
        update: {},
      });
      seeded.push(created.code);
    }

    return reply.code(200).send({ ok: true, departments: seeded });
  });

  done();
};
