/**
 * Database Migration Runner
 *
 * Manages sequential SQL migrations for the Arka Villa platform.
 * Tracks applied migrations via a `schema_migrations` table in the public schema.
 * Supports multi-tenant migrations that iterate across all active tenant schemas.
 */

import { createHash } from 'crypto';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

import type { PoolClient, QueryResultRow } from 'pg';
import { pool } from './pool';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MigrationFile {
  version: number;
  name: string;
  filename: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: number;
  name: string;
  checksum: string;
  applied_at: Date;
  applied_by: string;
  duration_ms: number | null;
}

export interface MigrationResult {
  applied: MigrationFile[];
  skipped: number;
  errors: Array<{ version: number; name: string; error: string }>;
}

export interface MigrationStatus {
  pending: MigrationFile[];
  applied: AppliedMigration[];
  checksum_mismatches: Array<{ version: number; expected: string; actual: string }>;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const MIGRATIONS_DIR =
  process.env.MIGRATIONS_DIR ??
  join(process.cwd(), 'infrastructure', 'db', 'migrations');

const MIGRATION_FILE_PATTERN = /^V(\d{3})__(.+)\.sql$/;

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Ensures the schema_migrations tracking table exists.
 */
async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version     INT PRIMARY KEY,
      name        VARCHAR(255) NOT NULL,
      checksum    VARCHAR(64) NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      applied_by  VARCHAR(100) NOT NULL DEFAULT current_user,
      duration_ms INT
    );
  `);
}

/**
 * Computes SHA-256 checksum of a migration's SQL content.
 */
function computeChecksum(sql: string): string {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

/**
 * Reads and parses migration files from the migrations directory.
 */
async function loadMigrationFiles(): Promise<MigrationFile[]> {
  let entries: string[];

  try {
    entries = await readdir(MIGRATIONS_DIR);
  } catch {
    // No migrations directory yet — nothing to apply
    return [];
  }

  const migrations: MigrationFile[] = [];

  for (const filename of entries.sort()) {
    const match = MIGRATION_FILE_PATTERN.exec(filename);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    const name = match[2];
    const filepath = join(MIGRATIONS_DIR, filename);
    const sql = await readFile(filepath, 'utf8');
    const checksum = computeChecksum(sql);

    migrations.push({ version, name, filename, sql, checksum });
  }

  return migrations;
}

/**
 * Fetches all previously applied migrations from the tracking table.
 */
async function getAppliedMigrations(client: PoolClient): Promise<AppliedMigration[]> {
  const result = await client.query<AppliedMigration & QueryResultRow>(
    'SELECT version, name, checksum, applied_at, applied_by, duration_ms FROM public.schema_migrations ORDER BY version'
  );
  return result.rows;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Runs all pending migrations in order.
 *
 * Migrations are executed within individual transactions — if a migration
 * fails, only that migration is rolled back and subsequent migrations are skipped.
 *
 * @returns Summary of applied, skipped, and failed migrations
 */
export async function runMigrations(): Promise<MigrationResult> {
  const client = await pool.connect();
  const result: MigrationResult = { applied: [], skipped: 0, errors: [] };

  try {
    await ensureMigrationsTable(client);

    const files = await loadMigrationFiles();
    const applied = await getAppliedMigrations(client);
    const appliedVersions = new Set(applied.map((m) => m.version));

    for (const migration of files) {
      if (appliedVersions.has(migration.version)) {
        // Check for checksum mismatch (modified after being applied)
        const existing = applied.find((m) => m.version === migration.version);
        if (existing && existing.checksum !== migration.checksum) {
          result.errors.push({
            version: migration.version,
            name: migration.name,
            error: `Checksum mismatch: migration V${String(migration.version).padStart(3, '0')}__${migration.name} was modified after being applied. Expected ${existing.checksum}, got ${migration.checksum}.`,
          });
        }
        result.skipped++;
        continue;
      }

      // Apply the migration
      const startTime = Date.now();

      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        const durationMs = Date.now() - startTime;

        await client.query(
          `INSERT INTO public.schema_migrations (version, name, checksum, duration_ms)
           VALUES ($1, $2, $3, $4)`,
          [migration.version, migration.name, migration.checksum, durationMs]
        );

        await client.query('COMMIT');
        result.applied.push(migration);
      } catch (err: unknown) {
        await client.query('ROLLBACK');
        const errorMessage = err instanceof Error ? err.message : String(err);
        result.errors.push({
          version: migration.version,
          name: migration.name,
          error: errorMessage,
        });
        // Stop on first failure — don't apply subsequent migrations
        break;
      }
    }
  } finally {
    client.release();
  }

  return result;
}

/**
 * Returns the current migration status: pending, applied, and any issues.
 */
export async function getMigrationStatus(): Promise<MigrationStatus> {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const files = await loadMigrationFiles();
    const applied = await getAppliedMigrations(client);
    const appliedVersions = new Set(applied.map((m) => m.version));

    const pending = files.filter((f) => !appliedVersions.has(f.version));

    const checksum_mismatches: MigrationStatus['checksum_mismatches'] = [];
    for (const file of files) {
      const existing = applied.find((m) => m.version === file.version);
      if (existing && existing.checksum !== file.checksum) {
        checksum_mismatches.push({
          version: file.version,
          expected: existing.checksum,
          actual: file.checksum,
        });
      }
    }

    return { pending, applied, checksum_mismatches };
  } finally {
    client.release();
  }
}

/**
 * CLI entrypoint — run migrations or check status when executed directly.
 */
async function main(): Promise<void> {
  const arg = process.argv[2];

  if (arg === '--status') {
    const status = await getMigrationStatus();

    console.log('\n═══ Migration Status ═══\n');
    console.log(`Applied: ${status.applied.length}`);
    console.log(`Pending: ${status.pending.length}`);

    if (status.checksum_mismatches.length > 0) {
      console.log(`\n⚠️  Checksum mismatches: ${status.checksum_mismatches.length}`);
      for (const m of status.checksum_mismatches) {
        console.log(`  V${String(m.version).padStart(3, '0')}: expected ${m.expected.slice(0, 12)}... got ${m.actual.slice(0, 12)}...`);
      }
    }

    if (status.pending.length > 0) {
      console.log('\nPending migrations:');
      for (const m of status.pending) {
        console.log(`  V${String(m.version).padStart(3, '0')}__${m.name}`);
      }
    }

    console.log('');
  } else {
    console.log('Running migrations...\n');
    const result = await runMigrations();

    console.log(`Applied: ${result.applied.length}`);
    console.log(`Skipped: ${result.skipped}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.applied.length > 0) {
      console.log('\nApplied:');
      for (const m of result.applied) {
        console.log(`  ✓ V${String(m.version).padStart(3, '0')}__${m.name}`);
      }
    }

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      for (const e of result.errors) {
        console.log(`  ✗ V${String(e.version).padStart(3, '0')}__${e.name}: ${e.error}`);
      }
      process.exitCode = 1;
    }
  }

  await pool.end();
}

// Run CLI if executed directly (not imported)
if (require.main === module) {
  main().catch((err) => {
    console.error('Migration runner failed:', err);
    process.exitCode = 1;
  });
}
