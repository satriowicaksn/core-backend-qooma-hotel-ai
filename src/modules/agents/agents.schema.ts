// zod schemas — validate at the route boundary.
// Field allowlist per PM ACK coding note: `agent_type`, `name`, `hotel_id`,
// timestamps are immutable — zod .strict() rejects them at the boundary.

import { z } from 'zod';

import { ValidationError } from '@core/errors/app-errors.js';

import type { AgentListFilters } from './agents.types.js';

// Permissive JSONB shape — no inner enum lock in slice-1 (Q-C-01 pattern).
const configField = z.record(z.string(), z.unknown());

const capacityField = z.number().int().min(1).max(100);

export const UpdateAgentBodySchema = z
  .object({
    is_active: z.boolean().optional(),
    capacity: capacityField.optional(),
    config: configField.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'update body must include at least one field',
  });

export const AgentIdParamSchema = z.object({
  id: z.string().uuid('agent id must be a valid uuid'),
});

const boolFlag = z.enum(['true', 'false']).transform((v) => v === 'true');

export const ListAgentsQuerySchema = z
  .object({
    is_active: boolFlag.optional(),
  })
  .strict();

function toValidationError(error: z.ZodError): ValidationError {
  const first = error.issues[0];
  const field = first?.path.join('.') ?? undefined;
  return new ValidationError(first?.message ?? 'Invalid input', {
    field,
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  });
}

export type UpdateAgentBody = z.infer<typeof UpdateAgentBodySchema>;

export function parseUpdateAgentBody(raw: unknown): UpdateAgentBody {
  const result = UpdateAgentBodySchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data;
}

export function parseAgentId(raw: unknown): string {
  const result = AgentIdParamSchema.safeParse(raw);
  if (!result.success) {
    throw toValidationError(result.error);
  }
  return result.data.id;
}

export function parseListAgentsQuery(raw: unknown): AgentListFilters {
  const result = ListAgentsQuerySchema.safeParse(raw ?? {});
  if (!result.success) {
    throw toValidationError(result.error);
  }
  const q = result.data;
  return { ...(q.is_active !== undefined ? { isActive: q.is_active } : {}) };
}
