# Infrastructure

This directory contains the Docker and database infrastructure for the Arka Villa multi-tenant platform.

## Quick Start (Development)

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Edit .env with your local passwords

# 3. Start infrastructure services only (Postgres, Redis, MinIO, n8n)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 4. Run Next.js locally
npm run dev
```

## Production Deployment

```bash
# Start all services including Nginx and Next.js
docker compose up -d
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL 16 + TimescaleDB | 5432 | Primary database with time-series extension |
| Redis 7 | 6379 | Cache, sessions, event bus (Redis Streams) |
| MinIO | 9000/9001 | Object storage (photos, documents, receipts) |
| n8n | 5678 | Workflow automation engine |
| Nginx | 80/443 | Reverse proxy with TLS termination |
| Next.js | 3000 | Application server |

## Directory Structure

```
infrastructure/
├── nginx/
│   ├── nginx.conf          # Main Nginx configuration
│   ├── conf.d/
│   │   └── default.conf    # Server blocks and proxy rules
│   └── ssl/                # TLS certificates (not committed)
└── db/
    └── init/               # Database initialization (runs once on first start)
        ├── 001-extensions.sql      # PostgreSQL extensions
        ├── 002-public-schema.sql   # Shared tables (tenants, users, roles, etc.)
        ├── 003-timescaledb-setup.sql # IoT hypertable with retention
        ├── 004-n8n-database.sql    # Separate DB for n8n
        └── 005-audit-permissions.sql # App role with append-only restrictions
```

## Database Schema

The platform uses a **tenant-per-schema** isolation pattern:

- **`public` schema**: Shared tables (tenants, users, user_tenant_roles, audit_logs, notification_preferences, event_store)
- **`tenant_<slug>` schemas**: Per-villa data (bookings, rooms, staff, maintenance, etc.)

Tenant schemas are provisioned dynamically when a new villa is registered.

## SSL/TLS (Production)

Place your certificates in `infrastructure/nginx/ssl/`:
- `fullchain.pem` - Certificate chain
- `privkey.pem` - Private key

Then uncomment the HTTPS server block in `infrastructure/nginx/conf.d/default.conf`.
