#!/usr/bin/env bash
#
# healthcheck.sh — Verify all services are healthy post-deploy
#
# Checks each service in the Arka Villa platform Docker stack
# and reports overall health status. Used by deploy.sh for
# automated rollback decisions.
#
# Usage:
#   ./scripts/healthcheck.sh [--quiet] [--json] [--service <name>]
#
# Exit codes:
#   0 — All critical services healthy
#   1 — One or more critical services unhealthy
#   2 — Non-critical services degraded (critical services OK)
#
# Requirements: 38.3, 38.4

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────
NEXTJS_HEALTH_URL="${NEXTJS_HEALTH_URL:-http://localhost:3000/api/health}"
NGINX_URL="${NGINX_URL:-http://localhost:80/health}"
N8N_HEALTH_URL="${N8N_HEALTH_URL:-http://localhost:5678/healthz}"
TIMEOUT=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ─── Parse Arguments ───────────────────────────────────────────────
QUIET=false
JSON_OUTPUT=false
SINGLE_SERVICE=""

for arg in "$@"; do
  case "$arg" in
    --quiet|-q) QUIET=true ;;
    --json|-j) JSON_OUTPUT=true ;;
    --service)
      shift
      SINGLE_SERVICE="${1:-}"
      ;;
    --help|-h)
      echo "Usage: $0 [--quiet] [--json] [--service <name>]"
      echo ""
      echo "Options:"
      echo "  --quiet, -q     Suppress output (exit code only)"
      echo "  --json, -j      Output results as JSON"
      echo "  --service NAME  Check a single service only"
      echo "  --help          Show this help message"
      exit 0
      ;;
  esac
done

# ─── Service Check Functions ───────────────────────────────────────

check_docker_health() {
  local container_name="$1"
  local status
  status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "not_found")
  echo "$status"
}

check_http_health() {
  local url="$1"
  local response_code
  response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  echo "$response_code"
}

# ─── Run Health Checks ─────────────────────────────────────────────

declare -A RESULTS
CRITICAL_FAILED=false
NON_CRITICAL_FAILED=false

# PostgreSQL (critical)
check_service_postgres() {
  local status
  status=$(check_docker_health "arka-postgres")
  if [ "$status" = "healthy" ]; then
    RESULTS[postgres]="healthy"
  else
    RESULTS[postgres]="unhealthy:${status}"
    CRITICAL_FAILED=true
  fi
}

# Redis (critical)
check_service_redis() {
  local status
  status=$(check_docker_health "arka-redis")
  if [ "$status" = "healthy" ]; then
    RESULTS[redis]="healthy"
  else
    RESULTS[redis]="unhealthy:${status}"
    CRITICAL_FAILED=true
  fi
}

# Next.js Application (critical)
check_service_nextjs() {
  local http_code
  http_code=$(check_http_health "$NEXTJS_HEALTH_URL")
  if [ "$http_code" = "200" ]; then
    RESULTS[nextjs]="healthy"
  elif [ "$http_code" = "503" ]; then
    RESULTS[nextjs]="unhealthy:http_${http_code}"
    CRITICAL_FAILED=true
  else
    RESULTS[nextjs]="unhealthy:http_${http_code}"
    CRITICAL_FAILED=true
  fi
}

# Nginx (critical)
check_service_nginx() {
  local http_code
  http_code=$(check_http_health "$NGINX_URL")
  if [ "$http_code" = "200" ]; then
    RESULTS[nginx]="healthy"
  else
    RESULTS[nginx]="unhealthy:http_${http_code}"
    CRITICAL_FAILED=true
  fi
}

# MinIO (non-critical)
check_service_minio() {
  local status
  status=$(check_docker_health "arka-minio")
  if [ "$status" = "healthy" ]; then
    RESULTS[minio]="healthy"
  else
    RESULTS[minio]="degraded:${status}"
    NON_CRITICAL_FAILED=true
  fi
}

# n8n Workflow Engine (non-critical)
check_service_n8n() {
  local http_code
  http_code=$(check_http_health "$N8N_HEALTH_URL")
  if [ "$http_code" = "200" ]; then
    RESULTS[n8n]="healthy"
  else
    RESULTS[n8n]="degraded:http_${http_code}"
    NON_CRITICAL_FAILED=true
  fi
}

# ─── Execute Checks ───────────────────────────────────────────────

if [ -n "$SINGLE_SERVICE" ]; then
  case "$SINGLE_SERVICE" in
    postgres) check_service_postgres ;;
    redis)    check_service_redis ;;
    nextjs)   check_service_nextjs ;;
    nginx)    check_service_nginx ;;
    minio)    check_service_minio ;;
    n8n)      check_service_n8n ;;
    *)
      echo "Unknown service: $SINGLE_SERVICE"
      exit 1
      ;;
  esac
else
  check_service_postgres
  check_service_redis
  check_service_nextjs
  check_service_nginx
  check_service_minio
  check_service_n8n
fi

# ─── Determine Overall Status ─────────────────────────────────────

if [ "$CRITICAL_FAILED" = true ]; then
  OVERALL_STATUS="unhealthy"
  EXIT_CODE=1
elif [ "$NON_CRITICAL_FAILED" = true ]; then
  OVERALL_STATUS="degraded"
  EXIT_CODE=2
else
  OVERALL_STATUS="healthy"
  EXIT_CODE=0
fi

# ─── Output Results ───────────────────────────────────────────────

if [ "$JSON_OUTPUT" = true ]; then
  echo "{"
  echo "  \"status\": \"${OVERALL_STATUS}\","
  echo "  \"timestamp\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
  echo "  \"services\": {"
  FIRST=true
  for service in "${!RESULTS[@]}"; do
    if [ "$FIRST" = false ]; then echo ","; fi
    FIRST=false
    local_status="${RESULTS[$service]}"
    printf "    \"%s\": \"%s\"" "$service" "$local_status"
  done
  echo ""
  echo "  }"
  echo "}"
elif [ "$QUIET" = false ]; then
  echo ""
  echo "╔═══════════════════════════════════════════╗"
  echo "║       Arka Villa Health Check Report      ║"
  echo "╠═══════════════════════════════════════════╣"

  for service in postgres redis nextjs nginx minio n8n; do
    if [ -z "${RESULTS[$service]+x}" ]; then
      continue
    fi
    local_status="${RESULTS[$service]}"
    if [[ "$local_status" == "healthy" ]]; then
      printf "║  ${GREEN}✓${NC} %-10s  %s\n" "$service" "healthy"
    elif [[ "$local_status" == degraded* ]]; then
      printf "║  ${YELLOW}~${NC} %-10s  %s\n" "$service" "$local_status"
    else
      printf "║  ${RED}✗${NC} %-10s  %s\n" "$service" "$local_status"
    fi
  done

  echo "╠═══════════════════════════════════════════╣"
  if [ "$OVERALL_STATUS" = "healthy" ]; then
    echo -e "║  Overall: ${GREEN}HEALTHY${NC}                         ║"
  elif [ "$OVERALL_STATUS" = "degraded" ]; then
    echo -e "║  Overall: ${YELLOW}DEGRADED${NC}                        ║"
  else
    echo -e "║  Overall: ${RED}UNHEALTHY${NC}                       ║"
  fi
  echo "╚═══════════════════════════════════════════╝"
  echo ""
fi

exit $EXIT_CODE
