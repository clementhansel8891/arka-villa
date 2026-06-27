-- Enable required PostgreSQL extensions
-- TimescaleDB is pre-installed via the timescale/timescaledb image

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS timescaledb;
