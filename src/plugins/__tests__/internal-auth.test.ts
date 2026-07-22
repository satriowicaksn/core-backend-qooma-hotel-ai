import { describe, expect, it } from '@jest/globals';

import { AuthError } from '@core/errors/app-errors.js';

import { assertInternalSecret } from '../internal-auth.js';

const SECRET = 'internal-secret-0123456789abcdef0123456789abcdef';

describe('assertInternalSecret', () => {
  it('should pass on an exact secret match', () => {
    expect(() => assertInternalSecret(SECRET, SECRET)).not.toThrow();
  });

  it('should throw AuthError when no secret is configured (fail-closed)', () => {
    expect(() => assertInternalSecret(undefined, SECRET)).toThrow(AuthError);
  });

  it('should throw AuthError when the header is missing or empty', () => {
    expect(() => assertInternalSecret(SECRET, undefined)).toThrow(AuthError);
    expect(() => assertInternalSecret(SECRET, '')).toThrow(AuthError);
  });

  it('should throw AuthError on a wrong secret of any length', () => {
    expect(() => assertInternalSecret(SECRET, 'nope')).toThrow(AuthError);
    expect(() => assertInternalSecret(SECRET, `${SECRET}x`)).toThrow(AuthError);
    expect(() => assertInternalSecret(SECRET, SECRET.slice(0, -1))).toThrow(AuthError);
  });
});
