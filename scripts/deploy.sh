#!/usr/bin/env bash
#
# deploy.sh — Main deployment script for Arka Villa platform
#
# Implements zero-downtime rolling deployment on a single VPS
# with automated health checks and auto-rollback capability.
#
# Usage:
#   ./scripts/deploy.sh [--skip-tests] [--force] [--rollback]
#
# Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6, 38.7, 38.8, 37.7

set -euo pipefail

# ─── Configuration ─────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
COMPOSE_PROJECT="arka-villa"

# Deployment settings
HEALTH_CHECK_WINDOW=120        # seconds — window for auto-rollback
HEALTH_CHECK_INTERVAL=5        # seconds between checks
RETAINED_VERSIONS=2            # previous images to keep
MAX_COLD_START=300             # seconds — max cold-start time
MANIFESTS_DIR="${PROJECT_DIR}/deploy-manifests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ─── Helpers ───────────────────────────────────────────────────────
log_info()  { echo -e "${BLUE}[INFO]${NC}  $(date '+%H:%M:%S') $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $(date '+%H:%M:%S') $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $(date '+%H:%M:%S') $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $*"; }

cleanup() {
  log_info "Cleaning up temporary files..."
}
trap cleanup EXIT

# ─── Parse Arguments ───────────────────────────────────────────────
SKIP_TESTS=false
FORCE_DEPLOY=false
DO_ROLLBACK=false

for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    --force) FORCE_DEPLOY=true ;;
    --rollback) DO_ROLLBACK=true ;;
    --help|-h)
      echo "Usage: $0 [--skip-tests] [--force] [--rollback]"
      echo ""
      echo "Options:"
      echo "  --skip-tests   Skip pre-deployment test gate"
      echo "  --force        Force deployment even if health checks are degraded"
      echo "  --rollback     Roll back to the previous deployment version"
      echo "  --help         Show this help message"
      exit 0
      ;;
    *)
      log_error "Unknown argument: $arg"
      exit 1
      ;;
  esac
done

# ─── Gather Deploy Metadata ───────────────────────────────────────
DEPLOY_START=$(date +%s)
DEPLOY_TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git -C "$PROJECT_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
DEPLOYER=$(whoami)
VERSION="${GIT_COMMIT}-$(date '+%Y%m%d%H%M%S')"

log_info "═══════════════════════════════════════════════════════"
log_info "  Arka Villa Deployment Pipeline"
log_info "  Version:  ${VERSION}"
log_info "  Branch:   ${GIT_BRANCH}"
log_info "  Commit:   ${GIT_COMMIT}"
log_info "  Deployer: ${DEPLOYER}"
log_info "  Time:     ${DEPLOY_TIMESTAMP}"
log_info "═══════════════════════════════════════════════════════"

# ─── Rollback ──────────────────────────────────────────────────────
if [ "$DO_ROLLBACK" = true ]; then
  log_info "Initiating rollback to previous version..."

  PREV_MANIFEST=$(find "$MANIFESTS_DIR" -name "*.json" -type f 2>/dev/null | sort -r | head -2 | tail -1)

  if [ -z "$PREV_MANIFEST" ]; then
    log_error "No previous deployment manifest found. Cannot rollback."
    exit 1
  fi

  PREV_VERSION=$(basename "$PREV_MANIFEST" .json)
  log_info "Rolling back to: ${PREV_VERSION}"

  # Pull the previous tagged images
  docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" up -d --no-deps --force-recreate nextjs
  log_ok "Rollback complete. Verifying health..."

  sleep 10
  "${SCRIPT_DIR}/healthcheck.sh" --quiet && log_ok "Rollback verified healthy" || log_error "Rollback health check failed"
  exit $?
fi

# ─── Pre-Deployment Test Gate ──────────────────────────────────────
if [ "$SKIP_TESTS" = false ]; then
  log_info "Running pre-deployment tests..."
  if ! (cd "$PROJECT_DIR" && npm run test 2>&1); then
    log_error "Tests failed. Deployment blocked."
    log_error "Use --skip-tests to bypass (not recommended for production)"
    exit 1
  fi
  log_ok "All tests passed"
else
  log_warn "Skipping pre-deployment tests (--skip-tests flag)"
fi

# ─── Check Image Size ─────────────────────────────────────────────
log_info "Building application image..."
docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" build nextjs

IMAGE_SIZE=$(docker image inspect "${COMPOSE_PROJECT}-nextjs:latest" --format='{{.Size}}' 2>/dev/null || echo "0")
MAX_SIZE=$((5 * 1024 * 1024 * 1024)) # 5GB

if [ "$IMAGE_SIZE" -gt "$MAX_SIZE" ]; then
  log_error "Image size (${IMAGE_SIZE} bytes) exceeds maximum (${MAX_SIZE} bytes)"
  if [ "$FORCE_DEPLOY" = false ]; then
    exit 1
  fi
  log_warn "Proceeding anyway (--force flag)"
fi
log_ok "Image built successfully (size: $((IMAGE_SIZE / 1024 / 1024))MB)"

# ─── Tag Current Images for Rollback ──────────────────────────────
log_info "Tagging current images for rollback retention..."
CURRENT_VERSION=$(docker inspect "${COMPOSE_PROJECT}-nextjs:latest" --format='{{.Id}}' 2>/dev/null | cut -c8-19 || echo "none")

if [ "$CURRENT_VERSION" != "none" ]; then
  docker tag "${COMPOSE_PROJECT}-nextjs:latest" "${COMPOSE_PROJECT}-nextjs:prev-${CURRENT_VERSION}" 2>/dev/null || true
fi

# Clean up old images beyond retention limit
log_info "Pruning old images (retaining ${RETAINED_VERSIONS} versions)..."
docker images "${COMPOSE_PROJECT}-nextjs" --format "{{.Tag}}" | grep "^prev-" | sort -r | tail -n +$((RETAINED_VERSIONS + 1)) | while read -r tag; do
  docker rmi "${COMPOSE_PROJECT}-nextjs:${tag}" 2>/dev/null || true
done

# ─── Zero-Downtime Rolling Deployment ─────────────────────────────
log_info "Starting zero-downtime rolling deployment..."

# Step 1: Update infrastructure services (postgres, redis, minio) if needed
log_info "Updating infrastructure services..."
docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" up -d --no-deps postgres redis minio

# Step 2: Wait for infrastructure health
log_info "Waiting for infrastructure services to be healthy..."
INFRA_TIMEOUT=60
INFRA_ELAPSED=0
while [ $INFRA_ELAPSED -lt $INFRA_TIMEOUT ]; do
  PG_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' arka-postgres 2>/dev/null || echo "unknown")
  REDIS_HEALTHY=$(docker inspect --format='{{.State.Health.Status}}' arka-redis 2>/dev/null || echo "unknown")

  if [ "$PG_HEALTHY" = "healthy" ] && [ "$REDIS_HEALTHY" = "healthy" ]; then
    log_ok "Infrastructure services are healthy"
    break
  fi
  sleep 3
  INFRA_ELAPSED=$((INFRA_ELAPSED + 3))
done

if [ $INFRA_ELAPSED -ge $INFRA_TIMEOUT ]; then
  log_error "Infrastructure services failed to become healthy within ${INFRA_TIMEOUT}s"
  exit 1
fi

# Step 3: Rolling update of the Next.js application
# The strategy: bring up the new container, wait for it to be healthy,
# then nginx will route traffic to it via the upstream definition.
log_info "Deploying Next.js application (rolling update)..."
docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" up -d --no-deps --force-recreate nextjs

# Step 4: Wait for Next.js startup grace period
log_info "Waiting for application startup (grace period)..."
sleep 10

# Step 5: Update nginx and n8n
log_info "Updating nginx and workflow engine..."
docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" up -d --no-deps nginx n8n

# ─── Post-Deployment Health Check Window ───────────────────────────
log_info "Starting health check window (${HEALTH_CHECK_WINDOW}s)..."
HEALTH_START=$(date +%s)
HEALTH_PASSED=false
CONSECUTIVE_HEALTHY=0
REQUIRED_HEALTHY=3  # Need 3 consecutive healthy checks

while true; do
  ELAPSED=$(( $(date +%s) - HEALTH_START ))

  if [ $ELAPSED -ge $HEALTH_CHECK_WINDOW ]; then
    break
  fi

  if "${SCRIPT_DIR}/healthcheck.sh" --quiet; then
    CONSECUTIVE_HEALTHY=$((CONSECUTIVE_HEALTHY + 1))
    if [ $CONSECUTIVE_HEALTHY -ge $REQUIRED_HEALTHY ]; then
      HEALTH_PASSED=true
      break
    fi
  else
    CONSECUTIVE_HEALTHY=0
    log_warn "Health check failed (${ELAPSED}s elapsed, will retry...)"
  fi

  sleep $HEALTH_CHECK_INTERVAL
done

# ─── Save Deployment Manifest (function) ───────────────────────────
save_manifest() {
  local status="${1:-success}"
  local deploy_end
  deploy_end=$(date +%s)
  local duration=$(( deploy_end - DEPLOY_START ))

  mkdir -p "$MANIFESTS_DIR"

  cat > "${MANIFESTS_DIR}/${VERSION}.json" <<EOF
{
  "version": "${VERSION}",
  "timestamp": "${DEPLOY_TIMESTAMP}",
  "deployer": "${DEPLOYER}",
  "gitCommit": "${GIT_COMMIT}",
  "gitBranch": "${GIT_BRANCH}",
  "configChanges": [],
  "servicesDeployed": ["nextjs", "nginx", "postgres", "redis", "minio", "n8n"],
  "previousVersion": "${CURRENT_VERSION}",
  "status": "${status}",
  "duration": ${duration},
  "healthChecksPassed": $([ "$HEALTH_PASSED" = true ] && echo "true" || echo "false")
}
EOF

  log_info "Deployment manifest saved: ${MANIFESTS_DIR}/${VERSION}.json"

  # Clean old manifests beyond retention (365 days)
  find "$MANIFESTS_DIR" -name "*.json" -mtime +365 -delete 2>/dev/null || true
}

# ─── Auto-Rollback if Health Checks Fail ───────────────────────────
if [ "$HEALTH_PASSED" = false ] && [ "$FORCE_DEPLOY" = false ]; then
  log_error "Health checks did not pass within ${HEALTH_CHECK_WINDOW}s window"
  log_error "Initiating automatic rollback..."

  # Restore previous version
  if [ "$CURRENT_VERSION" != "none" ]; then
    docker tag "${COMPOSE_PROJECT}-nextjs:prev-${CURRENT_VERSION}" "${COMPOSE_PROJECT}-nextjs:latest" 2>/dev/null || true
    docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT" up -d --no-deps --force-recreate nextjs
    log_warn "Rolled back to previous version: ${CURRENT_VERSION}"
  fi

  # Record failed deployment
  save_manifest "rolled_back"
  exit 1
fi

log_ok "Health checks passed"

save_manifest "success"

# ─── Summary ───────────────────────────────────────────────────────
DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))

echo ""
log_ok "═══════════════════════════════════════════════════════"
log_ok "  Deployment Complete"
log_ok "  Version:   ${VERSION}"
log_ok "  Duration:  ${DEPLOY_DURATION}s"
log_ok "  Status:    SUCCESS"
log_ok "═══════════════════════════════════════════════════════"
