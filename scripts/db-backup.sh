#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# Arka Villa — Database Backup Script
#
# Performs daily full backups (pg_dump) and continuous WAL archiving
# for point-in-time recovery. Supports per-tenant schema backups.
#
# Usage:
#   ./scripts/db-backup.sh full              # Full database backup
#   ./scripts/db-backup.sh wal               # Archive current WAL segment
#   ./scripts/db-backup.sh tenant <slug>     # Per-tenant schema backup
#
# Environment variables (with defaults from .env):
#   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB,
#   POSTGRES_USER, POSTGRES_PASSWORD,
#   BACKUP_DIR, BACKUP_RETENTION_DAYS
# ══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-arka_villa}"
POSTGRES_USER="${POSTGRES_USER:-arka}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/arka-villa}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-${BACKUP_DIR}/wal}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/backup.log"

# ─── Helpers ──────────────────────────────────────────────────────────
log() {
  local level="$1"
  shift
  echo "[$(date --iso-8601=seconds)] [${level}] $*" | tee -a "${LOG_FILE}"
}

ensure_dirs() {
  mkdir -p "${BACKUP_DIR}/full"
  mkdir -p "${BACKUP_DIR}/tenant"
  mkdir -p "${WAL_ARCHIVE_DIR}"
  mkdir -p "$(dirname "${LOG_FILE}")"
}

cleanup_old_backups() {
  log "INFO" "Cleaning backups older than ${BACKUP_RETENTION_DAYS} days..."
  find "${BACKUP_DIR}/full" -name "*.sql.gz" -mtime +"${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
  find "${BACKUP_DIR}/tenant" -name "*.sql.gz" -mtime +"${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
  find "${WAL_ARCHIVE_DIR}" -name "*.gz" -mtime +"${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true
  log "INFO" "Cleanup complete."
}

# ─── Full Backup ──────────────────────────────────────────────────────
do_full_backup() {
  local backup_file="${BACKUP_DIR}/full/${POSTGRES_DB}_full_${TIMESTAMP}.sql.gz"

  log "INFO" "Starting full backup of database '${POSTGRES_DB}'..."

  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${backup_file}" \
    2>> "${LOG_FILE}"

  local exit_code=$?

  if [ ${exit_code} -eq 0 ]; then
    local size
    size=$(du -h "${backup_file}" | cut -f1)
    log "INFO" "Full backup complete: ${backup_file} (${size})"
  else
    log "ERROR" "Full backup FAILED with exit code ${exit_code}"
    exit 1
  fi

  cleanup_old_backups
}

# ─── WAL Archiving ────────────────────────────────────────────────────
do_wal_archive() {
  local wal_file="${WAL_ARCHIVE_DIR}/wal_${TIMESTAMP}.gz"

  log "INFO" "Triggering WAL segment switch and archiving..."

  # Force a WAL switch so the current segment can be archived
  PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --command="SELECT pg_switch_wal();" \
    >> "${LOG_FILE}" 2>&1

  # Create a base backup for WAL-based point-in-time recovery
  PGPASSWORD="${POSTGRES_PASSWORD}" pg_basebackup \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --pgdata=- \
    --format=tar \
    --compress=gzip:9 \
    --checkpoint=fast \
    > "${wal_file}" 2>> "${LOG_FILE}"

  local exit_code=$?

  if [ ${exit_code} -eq 0 ]; then
    local size
    size=$(du -h "${wal_file}" | cut -f1)
    log "INFO" "WAL archive complete: ${wal_file} (${size})"
  else
    log "ERROR" "WAL archive FAILED with exit code ${exit_code}"
    exit 1
  fi
}

# ─── Per-Tenant Schema Backup ─────────────────────────────────────────
do_tenant_backup() {
  local tenant_slug="$1"
  local schema_name="tenant_${tenant_slug//-/_}"
  local backup_file="${BACKUP_DIR}/tenant/${schema_name}_${TIMESTAMP}.sql.gz"

  log "INFO" "Starting backup for tenant schema '${schema_name}'..."

  # Validate schema exists
  local schema_exists
  schema_exists=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --tuples-only \
    --command="SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = '${schema_name}';" 2>/dev/null)

  if [ "$(echo "${schema_exists}" | tr -d ' ')" != "1" ]; then
    log "ERROR" "Schema '${schema_name}' does not exist."
    exit 1
  fi

  PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
    --host="${POSTGRES_HOST}" \
    --port="${POSTGRES_PORT}" \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --schema="${schema_name}" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="${backup_file}" \
    2>> "${LOG_FILE}"

  local exit_code=$?

  if [ ${exit_code} -eq 0 ]; then
    local size
    size=$(du -h "${backup_file}" | cut -f1)
    log "INFO" "Tenant backup complete: ${backup_file} (${size})"
  else
    log "ERROR" "Tenant backup FAILED with exit code ${exit_code}"
    exit 1
  fi
}

# ─── Main ─────────────────────────────────────────────────────────────
main() {
  ensure_dirs

  local command="${1:-help}"

  case "${command}" in
    full)
      do_full_backup
      ;;
    wal)
      do_wal_archive
      ;;
    tenant)
      if [ -z "${2:-}" ]; then
        log "ERROR" "Usage: $0 tenant <tenant-slug>"
        exit 1
      fi
      do_tenant_backup "$2"
      ;;
    help|--help|-h)
      echo "Usage: $0 {full|wal|tenant <slug>}"
      echo ""
      echo "Commands:"
      echo "  full              Full database backup (pg_dump custom format, compressed)"
      echo "  wal               WAL archiving for point-in-time recovery"
      echo "  tenant <slug>     Per-tenant schema backup"
      echo ""
      echo "Environment:"
      echo "  POSTGRES_HOST             Database host (default: localhost)"
      echo "  POSTGRES_PORT             Database port (default: 5432)"
      echo "  POSTGRES_DB               Database name (default: arka_villa)"
      echo "  POSTGRES_USER             Database user (default: arka)"
      echo "  POSTGRES_PASSWORD         Database password (required)"
      echo "  BACKUP_DIR                Backup storage directory (default: /var/backups/arka-villa)"
      echo "  BACKUP_RETENTION_DAYS     Days to retain backups (default: 30)"
      echo ""
      echo "Scheduling (crontab examples):"
      echo "  # Daily full backup at 02:00"
      echo "  0 2 * * * /path/to/scripts/db-backup.sh full"
      echo "  # Hourly WAL archiving"
      echo "  0 * * * * /path/to/scripts/db-backup.sh wal"
      exit 0
      ;;
    *)
      log "ERROR" "Unknown command: ${command}"
      echo "Usage: $0 {full|wal|tenant <slug>}"
      exit 1
      ;;
  esac
}

main "$@"
