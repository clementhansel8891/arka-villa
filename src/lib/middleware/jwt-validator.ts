/**
 * JWT validation for the proxy middleware.
 *
 * Validates the session token from cookies, verifies the signature,
 * checks expiration, and extracts user session data.
 *
 * Uses HMAC-SHA256 for JWT signing (edge-compatible via Web Crypto API).
 */

import type { UserSession, PlatformRole } from './types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

/**
 * Validates a JWT token string and extracts the user session.
 *
 * @param token - The JWT token from the session cookie
 * @returns UserSession if valid, null if invalid or expired
 */
export async function validateJwt(token: string): Promise<UserSession | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const valid = await verifySignature(
      `${headerB64}.${payloadB64}`,
      signatureB64
    );
    if (!valid) {
      return null;
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    // Validate required fields
    if (!payload.userId || !payload.role || !payload.sessionId) {
      return null;
    }

    return {
      userId: payload.userId,
      role: payload.role as PlatformRole,
      tenantIds: payload.tenantIds ?? [],
      sessionId: payload.sessionId,
      iat: payload.iat ?? now,
      exp: payload.exp ?? now + 3600,
    };
  } catch {
    return null;
  }
}

/**
 * Verifies HMAC-SHA256 signature using Web Crypto API.
 */
async function verifySignature(
  data: string,
  signature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBytes = base64UrlToBytes(signature);
  return crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes.buffer as ArrayBuffer,
    encoder.encode(data)
  );
}

/**
 * Creates a signed JWT token (used by the auth module for session creation).
 *
 * @param payload - The session payload to sign
 * @returns Signed JWT string
 */
export async function signJwt(payload: Omit<UserSession, 'iat' | 'exp'> & { iat?: number; exp?: number }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: payload.iat ?? now,
    exp: payload.exp ?? now + 3600, // 60-minute default TTL
  };

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));

  const data = `${headerB64}.${payloadB64}`;
  const signature = await createSignature(data);

  return `${data}.${signature}`;
}

/**
 * Creates HMAC-SHA256 signature using Web Crypto API.
 */
async function createSignature(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

/**
 * Base64URL encoding utilities.
 */
function base64UrlEncode(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  return bytesToBase64Url(bytes);
}

function base64UrlDecode(str: string): string {
  const bytes = base64UrlToBytes(str);
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
