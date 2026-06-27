#!/bin/bash
# ══════════════════════════════════════════════════════════════════════
# Create a separate database for n8n workflow engine
# This runs as part of docker-entrypoint-initdb.d
# ══════════════════════════════════════════════════════════════════════

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE arka_n8n'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'arka_n8n')\gexec
EOSQL
