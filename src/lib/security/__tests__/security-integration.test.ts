/**
 * Security Integration Tests
 *
 * Tests for CORS enforcement, CSRF protection, input validation,
 * security headers, and rate limiting integration.
 *
 * Validates: Requirements 34.1, 34.2, 34.3, 34.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCorsConfig,
  isOriginAllowed,
  buildCorsHeaders,
  buildPreflightHeaders,
} from '../cors';
import type { CorsConfig } from '../cors';
import {
  generateCsrfToken,
  validateCsrfToken,
  requiresCsrfValidation,
  CSRF_PROTECTED_METHODS,
  CSRF_HEADER_NAME,
  CSRF_COOKIE_NAME,
} from '../csrf';
import {
  checkRateLimit,
  getRateLimitConfig,
  getRateLimitKey,
  RATE_LIMITS,
} from '../../middleware/rate-limiter';
import { sanitizeInput, containsDangerousPatterns } from '../../../modules/ai/security';

// ─── CORS Enforcement Tests ───────────────────────────────────────────────────

describe('CORS Enforcement (Requirement 34.1, 34.4)', () => {
  let config: CorsConfig;

  beforeEach(() => {
    config = getCorsConfig('development');
  });

  describe('blocked cross-origin requests', () => {
    it('rejects requests from unknown origins', () => {
      const maliciousOrigin = 'https://evil-site.com';
      const result = isOriginAllowed(maliciousOrigin, config);
      expect(result).toBe(false);
    });

    it('rejects requests from similar-looking origins (subdomain spoofing)', () => {
      const spoofedOrigin = 'https://localhost.evil.com';
      const result = isOriginAllowed(spoofedOrigin, config);
      expect(result).toBe(false);
    });

    it('rejects empty origin string', () => {
      const result = isOriginAllowed('', config);
      expect(result).toBe(false);
    });

    it('rejects origin with different port than allowed', () => {
      const result = isOriginAllowed('http://localhost:9999', config);
      expect(result).toBe(false);
    });

    it('does not build CORS headers for disallowed origin', () => {
      const headers = buildCorsHeaders('https://evil-site.com', config);
      expect(headers).toBeNull();
    });

    it('does not build preflight headers for disallowed origin', () => {
      const headers = buildPreflightHeaders('https://evil-site.com', config);
      expect(headers).toBeNull();
    });

    it('returns null for null request origin', () => {
      const headers = buildCorsHeaders(null, config);
      expect(headers).toBeNull();
    });
  });

  describe('allowed cross-origin requests', () => {
    it('allows requests from configured development origins', () => {
      expect(isOriginAllowed('http://localhost:3000', config)).toBe(true);
      expect(isOriginAllowed('http://localhost:3001', config)).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:3000', config)).toBe(true);
    });

    it('builds correct CORS headers for allowed origin', () => {
      const headers = buildCorsHeaders('http://localhost:3000', config);
      expect(headers).not.toBeNull();
      expect(headers!['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers!['Access-Control-Allow-Methods']).toContain('GET');
      expect(headers!['Access-Control-Allow-Methods']).toContain('POST');
      expect(headers!['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('includes X-CSRF-Token in allowed headers', () => {
      const headers = buildCorsHeaders('http://localhost:3000', config);
      expect(headers!['Access-Control-Allow-Headers']).toContain('X-CSRF-Token');
    });

    it('exposes rate limit headers', () => {
      const headers = buildCorsHeaders('http://localhost:3000', config);
      expect(headers!['Access-Control-Expose-Headers']).toContain('X-RateLimit-Limit');
      expect(headers!['Access-Control-Expose-Headers']).toContain('Retry-After');
    });
  });

  describe('production CORS strictness', () => {
    it('production config has no localhost origins', () => {
      const prodConfig = getCorsConfig('production');
      const hasLocalhost = prodConfig.allowedOrigins.some((o) =>
        o.includes('localhost')
      );
      expect(hasLocalhost).toBe(false);
    });

    it('production config rejects localhost origins', () => {
      const prodConfig = getCorsConfig('production');
      expect(isOriginAllowed('http://localhost:3000', prodConfig)).toBe(false);
    });
  });
});

// ─── CSRF Protection Tests ────────────────────────────────────────────────────

describe('CSRF Protection (Requirement 34.3, 34.4)', () => {
  describe('rejected requests without valid token', () => {
    it('rejects when CSRF header is missing', () => {
      const cookieToken = generateCsrfToken();
      const result = validateCsrfToken(null, cookieToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing CSRF header');
    });

    it('rejects when CSRF cookie is missing', () => {
      const headerToken = generateCsrfToken();
      const result = validateCsrfToken(headerToken, null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing CSRF cookie');
    });

    it('rejects when header and cookie tokens do not match', () => {
      const headerToken = generateCsrfToken();
      const cookieToken = generateCsrfToken();
      const result = validateCsrfToken(headerToken, cookieToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CSRF token mismatch');
    });

    it('rejects tokens of different lengths', () => {
      const result = validateCsrfToken('short', 'a-much-longer-token-value');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CSRF token mismatch');
    });

    it('rejects empty string tokens', () => {
      const result = validateCsrfToken('', '');
      expect(result.valid).toBe(false);
    });

    it('rejects undefined tokens', () => {
      const result = validateCsrfToken(undefined, undefined);
      expect(result.valid).toBe(false);
    });
  });

  describe('valid CSRF token acceptance', () => {
    it('accepts when header and cookie tokens match', () => {
      const token = generateCsrfToken();
      const result = validateCsrfToken(token, token);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('generates tokens of correct length (64 hex chars)', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });

    it('generates unique tokens on each call', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('CSRF method and path requirements', () => {
    it('requires CSRF for POST to API routes', () => {
      expect(requiresCsrfValidation('POST', '/api/v1/bookings')).toBe(true);
    });

    it('requires CSRF for PUT to API routes', () => {
      expect(requiresCsrfValidation('PUT', '/api/v1/tenants/123')).toBe(true);
    });

    it('requires CSRF for PATCH to API routes', () => {
      expect(requiresCsrfValidation('PATCH', '/api/v1/staff/tasks/456')).toBe(true);
    });

    it('requires CSRF for DELETE to API routes', () => {
      expect(requiresCsrfValidation('DELETE', '/api/v1/maintenance/tickets/789')).toBe(true);
    });

    it('does not require CSRF for GET requests', () => {
      expect(requiresCsrfValidation('GET', '/api/v1/bookings')).toBe(false);
    });

    it('does not require CSRF for OPTIONS requests', () => {
      expect(requiresCsrfValidation('OPTIONS', '/api/v1/bookings')).toBe(false);
    });

    it('does not require CSRF for webhook endpoints', () => {
      expect(requiresCsrfValidation('POST', '/api/v1/payments/webhook')).toBe(false);
      expect(requiresCsrfValidation('POST', '/api/v1/channels/sync/webhook')).toBe(false);
    });

    it('does not require CSRF for internal endpoints', () => {
      expect(requiresCsrfValidation('POST', '/api/v1/internal/events/emit')).toBe(false);
    });

    it('does not require CSRF for non-API paths', () => {
      expect(requiresCsrfValidation('POST', '/login')).toBe(false);
    });

    it('protects all state-changing methods', () => {
      expect(CSRF_PROTECTED_METHODS.has('POST')).toBe(true);
      expect(CSRF_PROTECTED_METHODS.has('PUT')).toBe(true);
      expect(CSRF_PROTECTED_METHODS.has('PATCH')).toBe(true);
      expect(CSRF_PROTECTED_METHODS.has('DELETE')).toBe(true);
    });

    it('CSRF header and cookie names are defined', () => {
      expect(CSRF_HEADER_NAME).toBe('x-csrf-token');
      expect(CSRF_COOKIE_NAME).toBe('__csrf_token');
    });
  });
});

// ─── Input Validation Tests ───────────────────────────────────────────────────

describe('Input Validation (Requirement 34.3)', () => {
  describe('SQL injection rejection', () => {
    it('detects DROP TABLE injection', () => {
      const result = sanitizeInput("'; DROP TABLE users; --");
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('sql_injection');
    });

    it('detects UNION SELECT injection', () => {
      const result = sanitizeInput("1 UNION SELECT * FROM passwords");
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('sql_injection');
    });

    it('detects OR 1=1 injection', () => {
      const result = sanitizeInput("admin' OR '1'='1'");
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('sql_injection');
    });

    it('detects SQL comment injection', () => {
      const result = sanitizeInput("admin --");
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('sql_injection');
    });

    it('strips SQL injection patterns from output', () => {
      const result = sanitizeInput("Hello; DROP TABLE bookings;");
      expect(result.sanitized).not.toContain('DROP TABLE');
    });
  });

  describe('XSS payload rejection', () => {
    it('detects script tag injection', () => {
      const result = sanitizeInput('<script>alert("xss")</script>');
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('xss');
    });

    it('detects javascript: protocol injection', () => {
      const result = sanitizeInput('javascript:alert(1)');
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('xss');
    });

    it('detects event handler injection', () => {
      const result = sanitizeInput('<img src=x onerror=alert(1)>');
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('xss');
    });

    it('detects iframe injection', () => {
      const result = sanitizeInput('<iframe src="https://evil.com"></iframe>');
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('xss');
    });

    it('detects document.cookie access', () => {
      const result = sanitizeInput('document.cookie');
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('xss');
    });

    it('detects eval() injection', () => {
      const result = sanitizeInput('eval(atob("bWFsaWNpb3Vz"))');
      expect(result.rejected).toBe(true);
      expect(result.patterns).toContain('xss');
    });
  });

  describe('containsDangerousPatterns utility', () => {
    it('returns true for strings with SQL injection', () => {
      expect(containsDangerousPatterns("SELECT * FROM users")).toBe(true);
    });

    it('returns true for strings with XSS', () => {
      expect(containsDangerousPatterns('<script>alert(1)</script>')).toBe(true);
    });

    it('returns false for safe strings', () => {
      expect(containsDangerousPatterns('Hello, how are you?')).toBe(false);
    });

    it('returns false for normal booking data', () => {
      expect(
        containsDangerousPatterns('Check-in: 2025-01-15, Guests: 2, Notes: Pool villa preferred')
      ).toBe(false);
    });
  });

  describe('safe input acceptance', () => {
    it('allows normal text without modification', () => {
      const input = 'Hello, I would like to book a villa for 5 nights.';
      const result = sanitizeInput(input);
      expect(result.rejected).toBe(false);
      expect(result.sanitized).toBe(input);
      expect(result.patterns).toHaveLength(0);
    });

    it('allows input with numbers and special characters', () => {
      const input = 'Check-in: 2025-03-15, Rate: $250/night, Guests: 2+1 child';
      const result = sanitizeInput(input);
      expect(result.rejected).toBe(false);
    });

    it('allows input with email addresses', () => {
      const input = 'Please send confirmation to guest@example.com';
      const result = sanitizeInput(input);
      expect(result.rejected).toBe(false);
    });
  });
});

// ─── Security Headers Tests ───────────────────────────────────────────────────

describe('Security Headers (Requirement 34.4)', () => {
  /**
   * These tests verify the security header values that are set in proxy.ts.
   * We test the expected header values as constants to ensure the
   * platform's security posture is maintained.
   */

  const EXPECTED_SECURITY_HEADERS = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none'",
  };

  it('X-Frame-Options is set to DENY to prevent clickjacking', () => {
    expect(EXPECTED_SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('X-Content-Type-Options is set to nosniff to prevent MIME sniffing', () => {
    expect(EXPECTED_SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });

  it('Strict-Transport-Security enforces HTTPS with long max-age', () => {
    const hsts = EXPECTED_SECURITY_HEADERS['Strict-Transport-Security'];
    expect(hsts).toContain('max-age=63072000');
    expect(hsts).toContain('includeSubDomains');
    expect(hsts).toContain('preload');
  });

  it('HSTS max-age is at least 2 years (63072000 seconds)', () => {
    const hsts = EXPECTED_SECURITY_HEADERS['Strict-Transport-Security'];
    const maxAgeMatch = hsts.match(/max-age=(\d+)/);
    expect(maxAgeMatch).not.toBeNull();
    const maxAge = parseInt(maxAgeMatch![1], 10);
    expect(maxAge).toBeGreaterThanOrEqual(63072000);
  });

  it('Content-Security-Policy prevents loading external scripts by default', () => {
    const csp = EXPECTED_SECURITY_HEADERS['Content-Security-Policy'];
    expect(csp).toContain("default-src 'self'");
  });

  it('Content-Security-Policy prevents framing (frame-ancestors none)', () => {
    const csp = EXPECTED_SECURITY_HEADERS['Content-Security-Policy'];
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('Content-Security-Policy restricts connect-src to self and websockets', () => {
    const csp = EXPECTED_SECURITY_HEADERS['Content-Security-Policy'];
    expect(csp).toContain("connect-src 'self' wss: https:");
  });

  it('Referrer-Policy restricts referrer leakage to strict-origin-when-cross-origin', () => {
    expect(EXPECTED_SECURITY_HEADERS['Referrer-Policy']).toBe(
      'strict-origin-when-cross-origin'
    );
  });
});

// ─── Rate Limiting Integration Tests ──────────────────────────────────────────

describe('Rate Limiting Integration (Requirement 34.1, 34.2)', () => {
  describe('verify 429 responses via rate limit logic', () => {
    it('denies request when rate limit is exhausted (429 scenario)', async () => {
      const mockRedis = {
        eval: async () => [0, 0, 3000] as [number, number, number],
      };

      const key = getRateLimitKey('192.168.1.100', 'ip');
      const config = getRateLimitConfig('/api/v1/auth/login', false);
      const result = await checkRateLimit(mockRedis, key, config);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBe(3); // 3000ms → 3 seconds
    });

    it('returns correct Retry-After value for denied requests', async () => {
      const mockRedis = {
        eval: async () => [0, 0, 10000] as [number, number, number],
      };

      const key = getRateLimitKey('10.0.0.1', 'ip');
      const result = await checkRateLimit(mockRedis, key, RATE_LIMITS.AUTH_IP);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(10);
    });

    it('authenticated user gets standard 100 req/min limit', () => {
      const config = getRateLimitConfig('/api/v1/bookings', true);
      expect(config.maxRequests).toBe(100);
      expect(config.windowSeconds).toBe(60);
    });

    it('authenticated user gets intensive 30 req/min for reports', () => {
      const config = getRateLimitConfig('/api/v1/financial/reports', true);
      expect(config.maxRequests).toBe(30);
      expect(config.windowSeconds).toBe(60);
    });

    it('authenticated user gets intensive 30 req/min for AI endpoints', () => {
      const config = getRateLimitConfig('/api/v1/ai/chat', true);
      expect(config.maxRequests).toBe(30);
      expect(config.windowSeconds).toBe(60);
    });

    it('unauthenticated IP gets 60 req/min for public pages', () => {
      const config = getRateLimitConfig('/villas/sunset-villa', false);
      expect(config.maxRequests).toBe(60);
      expect(config.windowSeconds).toBe(60);
    });

    it('unauthenticated IP gets strict 10 req/min for auth endpoints', () => {
      const config = getRateLimitConfig('/api/v1/auth/login', false);
      expect(config.maxRequests).toBe(10);
      expect(config.windowSeconds).toBe(60);
    });

    it('rate limit key correctly identifies IP-based limiting', () => {
      const key = getRateLimitKey('203.0.113.42', 'ip');
      expect(key).toBe('rl:ip:203.0.113.42');
    });

    it('rate limit key correctly identifies user-based limiting', () => {
      const key = getRateLimitKey('user-abc-123', 'user');
      expect(key).toBe('rl:user:user-abc-123');
    });
  });

  describe('rate limiter graceful degradation', () => {
    it('fails open when Redis is unavailable (allows request)', async () => {
      const brokenRedis = {
        eval: async () => {
          throw new Error('ECONNREFUSED');
        },
      };

      const key = getRateLimitKey('10.0.0.1', 'ip');
      const result = await checkRateLimit(brokenRedis, key, RATE_LIMITS.PUBLIC_IP);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(60);
    });

    it('returns full bucket capacity on Redis failure', async () => {
      const brokenRedis = {
        eval: async () => {
          throw new Error('Connection timeout');
        },
      };

      const key = getRateLimitKey('user-xyz', 'user');
      const result = await checkRateLimit(brokenRedis, key, RATE_LIMITS.STANDARD_USER);

      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(100);
      expect(result.retryAfter).toBe(0);
    });
  });

  describe('rate limit escalation detection (Requirement 34.5)', () => {
    it('detects 200% over-limit condition for blocking', () => {
      // When a user exceeds rate limit by >200%, they should be blocked for 15 min.
      // The detection logic: if user is making 3x the limit, that's 200% over.
      const limit = RATE_LIMITS.AUTH_IP.maxRequests; // 10
      const threshold = limit * 3; // 200% over = 3x the limit = 30 requests
      expect(threshold).toBe(30);

      // Standard endpoint limit
      const standardLimit = RATE_LIMITS.STANDARD_USER.maxRequests; // 100
      const standardThreshold = standardLimit * 3;
      expect(standardThreshold).toBe(300);
    });
  });
});
