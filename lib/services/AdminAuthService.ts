/**
 * AdminAuthService — server-side only.
 * Validates the ADMIN_SECRET passphrase and manages session tokens.
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 * ADMIN_SECRET must never appear in any return value or log output.
 * Never import this module in client components.
 */

import crypto from 'crypto';

export interface IAdminAuthService {
  validatePassphrase(passphrase: string): boolean;
  generateSessionToken(): string;
  validateSessionToken(token: string): boolean;
}

interface TokenEntry {
  expiresAt: number;
}

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

class AdminAuthService implements IAdminAuthService {
  /** Active tokens: token string → expiry timestamp */
  private readonly activeTokens = new Map<string, TokenEntry>();

  private getSecret(): Buffer | null {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) return null;
    return Buffer.from(secret, 'utf-8');
  }

  validatePassphrase(passphrase: string): boolean {
    const secretBuf = this.getSecret();
    if (!secretBuf) {
      // ADMIN_SECRET not configured — deny all access
      return false;
    }

    const inputBuf = Buffer.from(passphrase, 'utf-8');

    // timingSafeEqual requires equal-length buffers
    if (inputBuf.length !== secretBuf.length) {
      // Still run a dummy comparison to avoid length-based timing leak
      crypto.timingSafeEqual(secretBuf, secretBuf);
      return false;
    }

    return crypto.timingSafeEqual(inputBuf, secretBuf);
  }

  generateSessionToken(): string {
    const secretBuf = this.getSecret();
    if (!secretBuf) {
      throw new Error('ADMIN_SECRET is not configured');
    }

    // Use a random nonce so each token is unique
    const nonce = crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', secretBuf);
    hmac.update(nonce);
    const token = `${nonce}.${hmac.digest('hex')}`;

    this.pruneExpired();
    this.activeTokens.set(token, { expiresAt: Date.now() + TOKEN_TTL_MS });

    return token;
  }

  validateSessionToken(token: string): boolean {
    this.pruneExpired();
    const entry = this.activeTokens.get(token);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.activeTokens.delete(token);
      return false;
    }
    return true;
  }

  /** Remove all expired tokens to prevent unbounded memory growth. */
  private pruneExpired(): void {
    const now = Date.now();
    for (const [token, entry] of this.activeTokens) {
      if (now > entry.expiresAt) {
        this.activeTokens.delete(token);
      }
    }
  }
}

// Singleton export — server-side only
export const adminAuthService: IAdminAuthService = new AdminAuthService();
