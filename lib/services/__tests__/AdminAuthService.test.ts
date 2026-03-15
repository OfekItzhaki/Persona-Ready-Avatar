/**
 * Tests for AdminAuthService
 * Covers property-based test (5.1) and unit tests (5.2)
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// Helper: create a fresh AdminAuthService instance with a given ADMIN_SECRET
async function makeService(secret: string | undefined) {
  vi.resetModules();
  vi.stubEnv('ADMIN_SECRET', secret as string);
  if (secret === undefined) {
    // Remove the env var entirely
    delete process.env.ADMIN_SECRET;
  }
  const { adminAuthService } = await import('@/lib/services/AdminAuthService');
  return adminAuthService;
}

describe('AdminAuthService', () => {
  const TEST_SECRET = 'super-secret-passphrase-42';

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // ---- 5.2 Unit tests ----

  describe('Unit tests', () => {
    it('correct passphrase grants access (requirement 1.2)', async () => {
      const svc = await makeService(TEST_SECRET);
      expect(svc.validatePassphrase(TEST_SECRET)).toBe(true);
    });

    it('wrong passphrase denies access (requirement 1.3)', async () => {
      const svc = await makeService(TEST_SECRET);
      expect(svc.validatePassphrase('wrong-passphrase')).toBe(false);
    });

    it('missing ADMIN_SECRET denies all access (requirement 1.5)', async () => {
      const svc = await makeService(undefined);
      expect(svc.validatePassphrase('')).toBe(false);
      expect(svc.validatePassphrase('anything')).toBe(false);
    });

    it('empty string passphrase is rejected when secret is set', async () => {
      const svc = await makeService(TEST_SECRET);
      expect(svc.validatePassphrase('')).toBe(false);
    });

    it('generateSessionToken returns a non-empty string', async () => {
      const svc = await makeService(TEST_SECRET);
      const token = svc.generateSessionToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('generated token is valid immediately after creation', async () => {
      const svc = await makeService(TEST_SECRET);
      const token = svc.generateSessionToken();
      expect(svc.validateSessionToken(token)).toBe(true);
    });

    it('unknown token is invalid', async () => {
      const svc = await makeService(TEST_SECRET);
      expect(svc.validateSessionToken('not-a-real-token')).toBe(false);
    });

    it('two generated tokens are distinct', async () => {
      const svc = await makeService(TEST_SECRET);
      const t1 = svc.generateSessionToken();
      const t2 = svc.generateSessionToken();
      expect(t1).not.toBe(t2);
    });

    it('ADMIN_SECRET value never appears in generated token (requirement 1.6)', async () => {
      const svc = await makeService(TEST_SECRET);
      const token = svc.generateSessionToken();
      expect(token).not.toContain(TEST_SECRET);
    });

    it('ADMIN_SECRET value never appears in validatePassphrase return value (requirement 1.6)', async () => {
      const svc = await makeService(TEST_SECRET);
      // Return value is boolean — just confirm it is a boolean, not the secret
      const result = svc.validatePassphrase(TEST_SECRET);
      expect(typeof result).toBe('boolean');
    });

    it('generateSessionToken throws when ADMIN_SECRET is not set', async () => {
      const svc = await makeService(undefined);
      expect(() => svc.generateSessionToken()).toThrow();
    });
  });

  // ---- 5.1 Property test: passphrase rejection for non-matching inputs ----

  describe('Property 1: Passphrase rejection for non-matching inputs', () => {
    // Feature: photorealistic-avatar, Property 1: passphrase rejection for non-matching inputs
    // Validates: Requirements 1.1, 1.3
    it('any string that is not ADMIN_SECRET is rejected', async () => {
      const svc = await makeService(TEST_SECRET);

      fc.assert(
        fc.property(fc.string(), (passphrase) => {
          fc.pre(passphrase !== TEST_SECRET);
          return svc.validatePassphrase(passphrase) === false;
        }),
        { numRuns: 100 }
      );
    });
  });
});
