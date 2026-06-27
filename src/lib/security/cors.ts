/**
 * CORS (Cross-Origin Resource Sharing) configuration.
 *
 * Provides environment-aware allowed origins and utilities
 * for validating and setting CORS headers on API responses.
 *
 * Requirements: 34.1, 34.4
 */

export interface CorsConfig {
  /** Allowed origins for the current environment */
  allowedOrigins: string[];
  /** HTTP methods allowed for CORS requests */
  allowedMethods: string[];
  /** Headers the client may send */
  allowedHeaders: string[];
  /** Headers exposed to the client */
  exposedHeaders: string[];
  /** Whether credentials (cookies, auth headers) are allowed */
  allowCredentials: boolean;
  /** Max age for preflight cache in seconds */
  maxAge: number;
}

/**
 * Returns the CORS configuration for the given environment.
 */
export function getCorsConfig(env?: string): CorsConfig {
  const environment = env ?? process.env.NODE_ENV ?? 'development';

  const baseConfig: CorsConfig = {
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Request-ID',
      'X-Tenant-ID',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'Retry-After',
    ],
    allowCredentials: true,
    maxAge: 86400, // 24 hours
    allowedOrigins: [],
  };

  switch (environment) {
    case 'production':
      baseConfig.allowedOrigins = getProductionOrigins();
      break;
    case 'staging':
      baseConfig.allowedOrigins = getStagingOrigins();
      break;
    case 'development':
    case 'test':
    default:
      baseConfig.allowedOrigins = getDevelopmentOrigins();
      break;
  }

  return baseConfig;
}

function getProductionOrigins(): string[] {
  const origins: string[] = [];
  const baseUrl = process.env.APP_BASE_URL;
  if (baseUrl) {
    origins.push(baseUrl);
  }
  // Support villa subdomains
  const baseDomain = process.env.APP_BASE_DOMAIN;
  if (baseDomain) {
    origins.push(`https://${baseDomain}`);
    // Wildcard subdomain handling is done at validation time
  }
  // Additional configured origins (comma-separated)
  const extra = process.env.CORS_EXTRA_ORIGINS;
  if (extra) {
    origins.push(...extra.split(',').map((o) => o.trim()).filter(Boolean));
  }
  return origins;
}

function getStagingOrigins(): string[] {
  const origins: string[] = [];
  const stagingUrl = process.env.STAGING_URL;
  if (stagingUrl) {
    origins.push(stagingUrl);
  }
  const extra = process.env.CORS_EXTRA_ORIGINS;
  if (extra) {
    origins.push(...extra.split(',').map((o) => o.trim()).filter(Boolean));
  }
  return origins;
}

function getDevelopmentOrigins(): string[] {
  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];
}

/**
 * Checks whether the given origin is allowed by the CORS config.
 * Supports exact match and wildcard subdomain matching for the base domain.
 */
export function isOriginAllowed(origin: string, config: CorsConfig): boolean {
  if (!origin) return false;

  // Exact match
  if (config.allowedOrigins.includes(origin)) {
    return true;
  }

  // Subdomain match: check if origin is a subdomain of the base domain
  const baseDomain = process.env.APP_BASE_DOMAIN;
  if (baseDomain) {
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith(`.${baseDomain}`) || url.hostname === baseDomain) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Builds CORS headers for a response given the request origin.
 * Returns null if the origin is not allowed (do not set CORS headers).
 */
export function buildCorsHeaders(
  requestOrigin: string | null,
  config: CorsConfig
): Record<string, string> | null {
  if (!requestOrigin) return null;
  if (!isOriginAllowed(requestOrigin, config)) return null;

  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': requestOrigin,
    'Access-Control-Allow-Methods': config.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': config.allowedHeaders.join(', '),
    'Access-Control-Expose-Headers': config.exposedHeaders.join(', '),
    'Access-Control-Max-Age': String(config.maxAge),
  };

  if (config.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Builds a preflight (OPTIONS) response with correct CORS headers.
 * Returns headers to apply, or null if origin disallowed.
 */
export function buildPreflightHeaders(
  requestOrigin: string | null,
  config: CorsConfig
): Record<string, string> | null {
  return buildCorsHeaders(requestOrigin, config);
}
