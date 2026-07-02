import { describe, expect, it } from '@jest/globals';

import { AppError, AuthError, BusinessRuleError, NotFoundError } from '../app-errors.js';

describe('BusinessRuleError', () => {
  it('should construct with message and details.rule', () => {
    const err = new BusinessRuleError('Cannot transition closed → open', {
      rule: 'INVALID_TICKET_TRANSITION',
      from: 'closed',
      to: 'open',
    });

    expect(err.message).toBe('Cannot transition closed → open');
    expect(err.details).toEqual({
      rule: 'INVALID_TICKET_TRANSITION',
      from: 'closed',
      to: 'open',
    });
  });

  it('should expose statusCode 422, code BUSINESS_RULE, and name BusinessRuleError', () => {
    const err = new BusinessRuleError('any', { rule: 'ANY_RULE' });

    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('BUSINESS_RULE');
    expect(err.name).toBe('BusinessRuleError');
  });

  it('should serialize via toJson to Nathan envelope shape', () => {
    const err = new BusinessRuleError('Ticket already resolved', {
      rule: 'INVALID_TICKET_TRANSITION',
      ticketId: 't-1',
    });

    expect(err.toJson()).toEqual({
      code: 'BUSINESS_RULE',
      message: 'Ticket already resolved',
      details: {
        rule: 'INVALID_TICKET_TRANSITION',
        ticketId: 't-1',
      },
    });
  });

  it('should be an instance of BusinessRuleError, AppError, and Error', () => {
    const err = new BusinessRuleError('boom', { rule: 'X' });

    expect(err).toBeInstanceOf(BusinessRuleError);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(typeof err.stack).toBe('string');
    expect(err.stack).not.toBe('');
  });
});

describe('existing hierarchy sanity', () => {
  it('should expose statusCode 401 and code AUTH_ERROR for AuthError', () => {
    const err = new AuthError('token expired');

    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTH_ERROR');
    expect(err).toBeInstanceOf(AppError);
  });

  it('should construct NotFoundError with resource-only and resource+id shapes', () => {
    const bare = new NotFoundError('Ticket');
    expect(bare.statusCode).toBe(404);
    expect(bare.code).toBe('NOT_FOUND');
    expect(bare.message).toBe('Ticket not found');
    expect(bare.details).toEqual({ resource: 'Ticket', id: undefined });

    const withId = new NotFoundError('Ticket', 't-42');
    expect(withId.message).toBe('Ticket not found: t-42');
    expect(withId.details).toEqual({ resource: 'Ticket', id: 't-42' });
  });
});
