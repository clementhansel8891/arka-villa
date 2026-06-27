# Database Migration Strategy

## Overview

Arka Villa uses a file-based migration system with sequential versioning. Migrations are stored as SQL files and executed programmatically via `src/lib/db/migration-runner.ts`.

## Directory Structure

```
infrastructure/db/
├── init/                          # Initial schema (Docker entrypoint)
│   ├── 001-extensions.sql
│   ├── 002-public-schema.sql
│   ├── 003-timescaledb-setup.sql
│   ├── 004-n8n-database.sh
│   └── 005-audit-permissions.sql
├── migrations/                    # Versioned migrations (post-init)
│   ├── README.md                  # This file
│   └── V001__description.sql      # Migration files
└── seeds/                         # Optional development seed data
```

## Migration File Naming Convention

```
V{NNN}__{description}.sql
```

- `V` — Version prefix (required)
- `{NNN}` — Three-digit sequential version number (001, 002, 003...)
- `__` — Double underscore separator
- `{description}` — Snake_case description of the change

**Examples:**
- `V001__add_booking_notes_column.sql`
- `V002__create_marketing_campaigns_table.sql`
- `V003__add_iot_device_health_index.sql`

## Migration Tracking

Applied migrations are tracked in a `public.schema_migrations` table:

```sql
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version     INT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    checksum    VARCHAR(64) NOT NULL,
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by  VARCHAR(100) NOT NULL DEFAULT current_user,
    duration_ms INT
);
```

## Running Migrations

### Programmatic (Application Startup)

The migration runner is invoked during application startup to ensure the database schema is up-to-date:

```typescript
import { runMigrations } from '@/lib/db/migration-runner';

await runMigrations(); // Applies any pending migrations
```

### Manual (Development/Ops)

```bash
# Run pending migrations
npx tsx src/lib/db/migration-runner.ts

# Check migration status
npx tsx src/lib/db/migration-runner.ts --status
```

## Writing Migrations

### Rules

1. **Migrations are immutable** — Once applied to any environment, never modify a migration file. Create a new migration to make changes.
2. **Migrations must be idempotent** — Use `IF NOT EXISTS`, `IF EXISTS`, etc. to allow safe re-runs.
3. **Migrations must be reversible in concept** — Document what the reverse operation would be in a comment at the top.
4. **One concern per migration** — Each file should address a single schema change.
5. **No data migrations with schema changes** — Separate structural changes from data transformations.
6. **Test migrations against a backup** — Always test against a copy of production data before applying.

### Template

```sql
-- Migration: V{NNN}__{description}
-- Reverse: {describe the rollback steps}
-- Author: {name}
-- Date: {YYYY-MM-DD}

BEGIN;

-- Your DDL/DML here
-- Use IF NOT EXISTS / IF EXISTS for safety

COMMIT;
```

### Multi-Tenant Considerations

Migrations that affect tenant-specific schemas must iterate over all active tenants:

```sql
DO $$
DECLARE
    tenant RECORD;
BEGIN
    FOR tenant IN SELECT schema_name FROM public.tenants WHERE status = 'active' LOOP
        EXECUTE format('ALTER TABLE %I.bookings ADD COLUMN IF NOT EXISTS notes TEXT', tenant.schema_name);
    END LOOP;
END
$$;
```

## Environments

| Environment | Strategy | Timing |
|-------------|----------|--------|
| Development | Auto-run on app start | Every startup |
| Staging | Auto-run on deploy | Before app starts |
| Production | Manual trigger with approval | During maintenance window |

## Backup Before Migration

The migration runner automatically triggers a database backup before applying migrations in production mode. This can be disabled via the `SKIP_PRE_MIGRATION_BACKUP` environment variable.

## Rollback Strategy

Since migrations are forward-only, rollbacks are handled by creating a new "undo" migration. For emergencies, restore from the pre-migration backup taken automatically before each migration run.
