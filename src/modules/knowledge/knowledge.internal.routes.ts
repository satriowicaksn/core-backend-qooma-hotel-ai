import type { FastifyPluginCallback } from 'fastify';
import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import { makeInternalAuthPreHandler } from '@plugins/internal-auth.js';

import type { KnowledgeRepository } from './knowledge.repository.js';
import { serializeKnowledgeEntry } from './knowledge.serializer.js';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

const SearchBodySchema = z.object({
  hotel_id: z.string().uuid(),
  query: z.string().min(1).max(500),
  limit: z.number().int().positive().max(MAX_LIMIT).optional(),
});

export interface KnowledgeInternalRoutesOptions {
  readonly repo: KnowledgeRepository;
  readonly internalSecret: string | undefined;
}

export const knowledgeInternalRoutes: FastifyPluginCallback<KnowledgeInternalRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  fastify.addHook('preHandler', makeInternalAuthPreHandler(opts.internalSecret));

  fastify.post('/knowledge/search', async (req, reply) => {
    const parsed = SearchBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('knowledge search body failed validation', {
        issues: parsed.error.issues,
      });
    }
    const { hotel_id: hotelId, query } = parsed.data;
    const limit = parsed.data.limit ?? DEFAULT_LIMIT;

    const rows = await opts.repo.searchForRag(hotelId, query, limit);
    return reply.send({ data: rows.map(serializeKnowledgeEntry) });
  });

  done();
};
