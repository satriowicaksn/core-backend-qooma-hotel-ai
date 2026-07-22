// Internal RPC for integration-backend (register with { prefix: '/internal' }).
// Guarded by the X-Internal-Secret preHandler (timingSafeEqual — see
// plugins/internal-auth.ts); no tenant session on these routes.
//
// LOGGING DISCIPLINE (ADD-24 anti-cheat): neither the stored otp_code nor the
// attempted code is EVER logged — log lines below carry ids only.

import type { FastifyPluginCallback, FastifyRequest } from 'fastify';

import { makeInternalAuthPreHandler } from '@plugins/internal-auth.js';

import {
  parseMarkDeliveredBody,
  parseResolveTelegramBody,
  parseSkipBody,
  parseTelegramMessageBody,
  parseTicketIdParam,
  parseVerifyBody,
} from './otp.schema.js';
import type { OtpService } from './otp.service.js';

export interface OtpInternalRoutesOptions {
  readonly service: OtpService;
  readonly internalSecret: string | undefined;
}

function correlationIdOf(req: FastifyRequest): string {
  const header = req.headers['x-correlation-id'];
  if (typeof header === 'string' && header.length > 0) {
    return header;
  }
  return req.id;
}

export const otpInternalRoutes: FastifyPluginCallback<OtpInternalRoutesOptions> = (
  fastify,
  opts,
  done,
) => {
  const { service } = opts;

  // Scope-local guard: applies to every route in this plugin only.
  fastify.addHook('preHandler', makeInternalAuthPreHandler(opts.internalSecret));

  fastify.post('/tickets/resolve-telegram', async (req, reply) => {
    const { hotelId, telegramMessageId } = parseResolveTelegramBody(req.body);
    req.log.info(
      { module: 'otp', action: 'resolve_telegram', correlationId: correlationIdOf(req) },
      'resolve telegram message to ticket',
    );
    const { ticketId } = await service.resolveTelegram(hotelId, telegramMessageId);
    return reply.send({ ticket_id: ticketId });
  });

  fastify.post('/tickets/:id/telegram-message', async (req, reply) => {
    const id = parseTicketIdParam(req.params);
    const { telegramMessageId } = parseTelegramMessageBody(req.body);
    req.log.info(
      {
        module: 'otp',
        action: 'telegram_message',
        ticketId: id,
        correlationId: correlationIdOf(req),
      },
      'store telegram message mapping',
    );
    await service.setTelegramMessage(id, telegramMessageId);
    return reply.send({ ok: true });
  });

  fastify.post('/tickets/:id/otp/ack-delivered', async (req, reply) => {
    const id = parseTicketIdParam(req.params);
    req.log.info(
      { module: 'otp', action: 'ack_delivered', ticketId: id, correlationId: correlationIdOf(req) },
      'stamp otp delivered',
    );
    await service.ackDelivered(id);
    return reply.send({ ok: true });
  });

  fastify.post('/tickets/:id/otp/mark-delivered', async (req, reply) => {
    const id = parseTicketIdParam(req.params);
    const { actorTelegramId } = parseMarkDeliveredBody(req.body);
    req.log.info(
      {
        module: 'otp',
        action: 'mark_delivered',
        ticketId: id,
        correlationId: correlationIdOf(req),
      },
      'staff DONE click — start otp grace timer',
    );
    const { graceDeadline } = await service.markDelivered(id, actorTelegramId);
    return reply.send({ grace_deadline: graceDeadline.toISOString() });
  });

  fastify.post('/tickets/:id/otp/verify', async (req, reply) => {
    const id = parseTicketIdParam(req.params);
    const { code, actorTelegramId } = parseVerifyBody(req.body);
    // Deliberately NOT logging the attempted code (mask by omission).
    req.log.info(
      { module: 'otp', action: 'verify', ticketId: id, correlationId: correlationIdOf(req) },
      'verify otp code',
    );
    const { result, attemptsLeft } = await service.verifyCode(id, code, actorTelegramId);
    return reply.send({
      result,
      ...(attemptsLeft !== undefined ? { attempts_left: attemptsLeft } : {}),
    });
  });

  fastify.post('/tickets/:id/otp/skip', async (req, reply) => {
    const id = parseTicketIdParam(req.params);
    const { reason, note } = parseSkipBody(req.body);
    req.log.info(
      { module: 'otp', action: 'skip', ticketId: id, reason, correlationId: correlationIdOf(req) },
      'skip otp verification (grace-close)',
    );
    await service.skip(id, reason, note);
    return reply.send({ ok: true });
  });

  fastify.post('/tickets/:id/otp/resend', async (req, reply) => {
    const id = parseTicketIdParam(req.params);
    req.log.info(
      { module: 'otp', action: 'resend', ticketId: id, correlationId: correlationIdOf(req) },
      'resend otp to guest',
    );
    const { otpCode } = await service.resend(id);
    // The ONLY surface that returns the code — internal callers only.
    return reply.send({ otp_code: otpCode });
  });

  done();
};
