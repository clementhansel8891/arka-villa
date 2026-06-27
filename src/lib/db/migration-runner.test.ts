/**
 * Tests for the database migration runner.
 *
 * These tests verify the migration file parsing, checksum computation,
 * and migration logic without requiring a live database connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the pool before importing the module
vi.mock('./pool', () => ({
  pool: {
    connect: vi.fn(),
    query: vi.fn(),
    end: vi.fn(),
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

import { readdir, readFile } from 'fs/promises';
import { createHash } from 'crypto';
import { pool } from './pool';
import { runMigrations, getMigrationStatus } from './migration-runner';

const mockReaddir = vi.mocked(readdir);
const mockReadFile = vi.mocked(readFile);
const mockPool = vi.mocked(pool);

describe('migration-runner', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient as never);
  });

  describe('runMigrations', () => {
    it('creates the schema_migrations table if it does not exist', async () => {
      mockReaddir.mockResolvedValue([] as never);
      mockClient.query
        .mockResolvedValueOnce(undefined) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [] }); // SELECT applied migrations

      await runMigrations();

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS public.schema_migrations')
      );
    });

    it('skips already-applied migrations', async () => {
      const sql = 'CREATE TABLE test (id INT);';
      const checksum = createHash('sha256').update(sql, 'utf8').digest('hex');

      mockReaddir.mockResolvedValue(['V001__create_test.sql'] as never);
      mockReadFile.mockResolvedValue(sql as never);
      mockClient.query
        .mockResolvedValueOnce(undefined) // CREATE TABLE
        .mockResolvedValueOnce({
          rows: [{ version: 1, name: 'create_test', checksum, applied_at: new Date(), applied_by: 'arka', duration_ms: 10 }],
        }); // SELECT applied

      const result = await runMigrations();

      expect(result.skipped).toBe(1);
      expect(result.applied).toHaveLength(0);
    });

    it('applies pending migrations in order', async () => {
      mockReaddir.mockResolvedValue(['V001__first.sql', 'V002__second.sql'] as never);
      mockReadFile
        .mockResolvedValueOnce('SELECT 1;' as never)
        .mockResolvedValueOnce('SELECT 2;' as never);

      mockClient.query
        .mockResolvedValueOnce(undefined) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [] }) // No applied migrations
        .mockResolvedValueOnce(undefined) // BEGIN (migration 1)
        .mockResolvedValueOnce(undefined) // SQL (migration 1)
        .mockResolvedValueOnce(undefined) // INSERT tracking (migration 1)
        .mockResolvedValueOnce(undefined) // COMMIT (migration 1)
        .mockResolvedValueOnce(undefined) // BEGIN (migration 2)
        .mockResolvedValueOnce(undefined) // SQL (migration 2)
        .mockResolvedValueOnce(undefined) // INSERT tracking (migration 2)
        .mockResolvedValueOnce(undefined); // COMMIT (migration 2)

      const result = await runMigrations();

      expect(result.applied).toHaveLength(2);
      expect(result.applied[0].version).toBe(1);
      expect(result.applied[1].version).toBe(2);
    });

    it('stops on first migration failure and rolls back', async () => {
      mockReaddir.mockResolvedValue(['V001__good.sql', 'V002__bad.sql', 'V003__skipped.sql'] as never);
      mockReadFile
        .mockResolvedValueOnce('SELECT 1;' as never)
        .mockResolvedValueOnce('INVALID SQL;' as never)
        .mockResolvedValueOnce('SELECT 3;' as never);

      mockClient.query
        .mockResolvedValueOnce(undefined) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [] }) // No applied
        .mockResolvedValueOnce(undefined) // BEGIN (1)
        .mockResolvedValueOnce(undefined) // SQL (1)
        .mockResolvedValueOnce(undefined) // INSERT (1)
        .mockResolvedValueOnce(undefined) // COMMIT (1)
        .mockResolvedValueOnce(undefined) // BEGIN (2)
        .mockRejectedValueOnce(new Error('syntax error')) // SQL (2) fails
        .mockResolvedValueOnce(undefined); // ROLLBACK (2)

      const result = await runMigrations();

      expect(result.applied).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].version).toBe(2);
      expect(result.errors[0].error).toContain('syntax error');
    });

    it('detects checksum mismatches for applied migrations', async () => {
      const sql = 'CREATE TABLE test (id INT);';
      mockReaddir.mockResolvedValue(['V001__create_test.sql'] as never);
      mockReadFile.mockResolvedValue(sql as never);

      mockClient.query
        .mockResolvedValueOnce(undefined) // CREATE TABLE
        .mockResolvedValueOnce({
          rows: [{ version: 1, name: 'create_test', checksum: 'different_checksum', applied_at: new Date(), applied_by: 'arka', duration_ms: 10 }],
        });

      const result = await runMigrations();

      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Checksum mismatch');
    });

    it('ignores non-migration files in the directory', async () => {
      mockReaddir.mockResolvedValue(['README.md', 'V001__valid.sql', '.gitkeep'] as never);
      mockReadFile.mockResolvedValue('SELECT 1;' as never);

      mockClient.query
        .mockResolvedValueOnce(undefined) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [] }) // No applied
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(undefined) // SQL
        .mockResolvedValueOnce(undefined) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await runMigrations();

      expect(result.applied).toHaveLength(1);
      expect(result.applied[0].name).toBe('valid');
    });

    it('handles empty migrations directory', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      mockClient.query
        .mockResolvedValueOnce(undefined) // CREATE TABLE
        .mockResolvedValueOnce({ rows: [] }); // No applied

      const result = await runMigrations();

      expect(result.applied).toHaveLength(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getMigrationStatus', () => {
    it('returns pending and applied migrations', async () => {
      const sql1 = 'SELECT 1;';
      const checksum1 = createHash('sha256').update(sql1, 'utf8').digest('hex');

      mockReaddir.mockResolvedValue(['V001__applied.sql', 'V002__pending.sql'] as never);
      mockReadFile
        .mockResolvedValueOnce(sql1 as never)
        .mockResolvedValueOnce('SELECT 2;' as never);

      mockClient.query
        .mockResolvedValueOnce(undefined) // CREATE TABLE
        .mockResolvedValueOnce({
          rows: [{ version: 1, name: 'applied', checksum: checksum1, applied_at: new Date(), applied_by: 'arka', duration_ms: 5 }],
        });

      const status = await getMigrationStatus();

      expect(status.applied).toHaveLength(1);
      expect(status.pending).toHaveLength(1);
      expect(status.pending[0].version).toBe(2);
      expect(status.checksum_mismatches).toHaveLength(0);
    });
  });
});
