#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# Arka Villa — Database Restore Script
#
# Restores the database from full backups or per-tenant schema backups.
# Supports point-in-time recovery using WAL archives.
#
# Usage:
#   ./scripts/db-restore.sh full <backup-file>               # Restore full database
#   ./scripts/db-restore.sh tenant <backup-file> [schema]    # Restore tenant schema
#   ./scripts/db-restore.sh list                              # List available backups
#   ./scripts/db-restore.sh pitr <timestamp>                  # Point-in-time recovery
#
# Environment variables (with defaults from .env):
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB,
#   POSTGRES_USER, POSTGRES_PASSWORD,
#   BACKUP_DIR
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-arka_villa}"
POSTGRES_USER="${POSTGRES_USER:-arka}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/arka-villa}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-${BACKUP_DIR}/wal}"
LOG_FILE="${BACKUP_DIR}/restore.log"

# ─── Helpers ──────────────────────────────────────────────────────────
log() {
  local level="$1"
  shift
  echo "[$(date --iso-8601=seconds)] [${level}] $*" | tee -a "${LOG_FILE}"
}

confirm_action() {
  local message="$1"
  echo ""
  echo "⚠️  WARNING: ${message}"
  echo ""
  read -rp "Are you sure you want to proceed? (yes/no): " response
  if [ "${response}" != "yes" ]; then
    log "INFO" "Restore cancelled by user."
    exit 0
  fi
}

# ─── Full Restore ─────────────────────────────────────────────────────
do_full_restore() {
  local backup_file="$1"

  if [ ! -f "${backup_file}" ]; then
    log "ERROR" "Backup file not found: ${backup_file}"
    exit 1
  fi

  confirm_action "This will OVERWRITE the entire '${POSTGRES_DB}' database. All current data will be lost."

  log "INFO" "Starting full restore from: ${backup_file}"

  # Terminate active connections to allow drop/recreate
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="postgres" \
    --command="SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
    >> "${LOG_FILE}" 2>&1 || true

  # Drop and recreate the database
  PGPASSWORD="${POSTGRES_PASSWORD}" dropdb \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --if-exists \
    "${POSTGRES_DB}" \
    2>> "${LOG_FILE}"

  PGPASSWORD="${POSTGRES_PASSWORD}" createdb \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --owner="${POSTGRES_USER}" \
    "${POSTGRES_DB}" \
    2>> "${LOG_FILE}"

  # Restore from the backup file
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_restore \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    "${backup_file}" \
    2>> "${LOG_FILE}"

  local exit_code=$?

  if [ ${exit_code} -eq 0 ]; then
    log "INFO" "Full restore complete from: ${backup_file}"
  else
    # pg_restore may return non-zero for non-fatal warnings
    log "WARN" "Restore finished with warnings (exit code ${exit_code}). Check ${LOG_FILE} for details."
  fi
}

# ─── Tenant Schema Restore ────────────────────────────────────────────
do_tenant_restore() {
  local backup_file="$1"
  local target_schema="${2:-}"

  if [ ! -f "${backup_file}" ]; then
    log "ERROR" "Backup file not found: ${backup_file}"
    exit 1
  fi

  confirm_action "This will restore a tenant schema from backup. Existing schema data will be replaced."

  log "INFO" "Starting tenant schema restore from: ${backup_file}"

  # If a target schema is specified, drop it first for a clean restore
  if [ -n "${target_schema}" ]; then
    log "INFO" "Dropping existing schema '${target_schema}' if present..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql \
      --host="${POSTGRES_HOST}" \
      --port="${POSTGRES_PORT}" \
      --username="${POSTGRES_USER}" \
      --dbname="${POSTGRES_DB}" \
      --command="DROP SCHEMA IF EXISTS ${target_schema} CASCADE;" \
      >> "${LOG_FILE}" 2>&1
  fi

  # Restore the schema from backup
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_restore \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --verbose \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    "${backup_file}" \
    2>> "${LOG_FILE}"

  local exit_code=$?

  if [ ${exit_code} -eq 0 ]; then
    log "INFO" "Tenant restore complete from: ${backup_file}"
  else
    log "WARN" "Tenant restore finished with warnings (exit code ${exit_code}). Check ${LOG_FILE}."
  fi
}

# ─── Point-in-Time Recovery ───────────────────────────────────────────
do_pitr() {
  local target_time="$1"

  confirm_action "Point-in-time recovery to '${target_time}'. This is a complex operation that requires database downtime."

  log "INFO" "Point-in-time recovery requested to: ${target_time}"

  # Find the most recent full backup before the target time
  local latest_base
  latest_base=$(find "${WAL_ARCHIVE_DIR}" -name "wal_*.gz" -type f | sort | tail -1)

  if [ -z "${latest_base}" ]; then
    log "ERROR" "No WAL archives found in ${WAL_ARCHIVE_DIR}. Cannot perform PITR."
    exit 1
  fi

  log "INFO" "Using base backup: ${latest_base}"
  log "INFO" "Recovery target time: ${target_time}"
  echo ""
  echo "To complete PITR, configure PostgreSQL recovery:"
  echo ""
  echo "  1. Stop PostgreSQL"
  echo "  2. Replace data directory with base backup:"
  echo "     tar -xzf ${latest_base} -C /var/lib/postgresql/data/"
  echo "  3. Create recovery.signal file:"
  echo "     touch /var/lib/postgresql/data/recovery.signal"
  echo "  4. Add to postgresql.conf:"
  echo "     restore_command = 'gunzip -c ${WAL_ARCHIVE_DIR}/%f.gz > %p'"
  echo "     recovery_target_time = '${target_time}'"
  echo "     recovery_target_action = 'promote'"
  echo "  5. Start PostgreSQL"
  echo ""
  log "INFO" "PITR instructions displayed. Manual intervention required."
}

# ─── List Available Backups ───────────────────────────────────────────
do_list() {
  echo ""
  echo "═══ Available Full Backups ═══"
  if [ -d "${BACKUP_DIR}/full" ]; then
    find "${BACKUP_DIR}/full" -name "*.sql.gz" -type f -printf "  %T+ %s %p\n" 2>/dev/null | sort -r | head -20
    local count
    count=$(find "${BACKUP_DIR}/full" -name "*.sql.gz" -type f 2>/dev/null | wc -l)
    echo "  Total: ${count} backup(s)"
  else
    echo "  No full backups found."
  fi

  echo ""
  echo "═══ Available Tenant Backups ═══"
  if [ -d "${BACKUP_DIR}/tenant" ]; then
    find "${BACKUP_DIR}/tenant" -name "*.sql.gz" -type f -printf "  %T+ %s %p\n" 2>/dev/null | sort -r | head -20
    local count
    count=$(find "${BACKUP_DIR}/tenant" -name "*.sql.gz" -type f 2>/dev/null | wc -l)
    echo "  Total: ${count} backup(s)"
  else
    echo "  No tenant backups found."
  fi

  echo ""
  echo "═══ Available WAL Archives ═══"
  if [ -d "${WAL_ARCHIVE_DIR}" ]; then
    find "${WAL_ARCHIVE_DIR}" -name "wal_*.gz" -type f -printf "  %T+ %s %p\n" 2>/dev/null | sort -r | head -10
    local count
    count=$(find "${WAL_ARCHIVE_DIR}" -name "wal_*.gz" -type f 2>/dev/null | wc -l)
    echo "  Total: ${count} archive(s)"
  else
    echo "  No WAL archives found."
  fi
  echo ""
}

# ─── Main ─────────────────────────────────────────────────────────────
main() {
  mkdir -p "$(dirname "${LOG_FILE}")"

  local command="${1:-help}"

  case "${command}" in
    full)
      if [ -z "${2:-}" ]; then
        log "ERROR" "Usage: $0 full <backup-file>"
        exit 1
      fi
      do_full_restore "$2"
      ;;
    tenant)
      if [ -z "${2:-}" ]; then
        log "ERROR" "Usage: $0 tenant <backup-file> [schema-name]"
        exit 1
      fi
      do_tenant_restore "$2" "${3:-}"
      ;;
    pitr)
      if [ -z "${2:-}" ]; then
        log "ERROR" "Usage: $0 pitr <target-timestamp>"
        echo "  Example: $0 pitr '2024-01-15 14:30:00+00'"
        exit 1
      fi
      do_pitr "$2"
      ;;
    list)
      do_list
      ;;
    help|--help|-h)
      echo "Usage: $0 {full|tenant|pitr|list}"
      echo ""
      echo "Commands:"
      echo "  full <backup-file>              Restore entire database from backup"
      echo "  tenant <backup-file> [schema]   Restore tenant schema from backup"
      echo "  pitr <timestamp>                Point-in-time recovery instructions"
      echo "  list                            List available backups"
      echo ""
      echo "Environment:"
      echo "  POSTGRES_HOST             Database host (default: localhost)"
      echo "  POSTGRES_PORT             Database port (default: 5432)"
      echo "  POSTGRES_DB               Database name (default: arka_villa)"
      echo "  POSTGRES_USER             Database user (default: arka)"
      echo "  POSTGRES_PASSWORD         Database password (required)"
      echo "  BACKUP_DIR                Backup storage directory (default: /var/backups/arka-villa)"
      exit 0
      ;;
    *)
      log "ERROR" "Unknown command: ${command}"
      echo "Usage: $0 {full|tenant|pitr|list}"
      exit 1
      ;;
  esac
}

main "$@"
