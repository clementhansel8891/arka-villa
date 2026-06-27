-- ══════════════════════════════════════════════════════════════════════
-- TimescaleDB hypertable for IoT readings
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS iot_readings (
    time TIMESTAMPTZ NOT NULL,
    device_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- Convert to hypertable (time-series optimized storage)
SELECT create_hypertable('iot_readings', 'time', if_not_exists => TRUE);

-- Retention policy: auto-drop data older than 90 days
SELECT add_retention_policy('iot_readings', INTERVAL '90 days', if_not_exists => TRUE);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_iot_readings_device ON iot_readings(device_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_iot_readings_tenant ON iot_readings(tenant_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_iot_readings_metric ON iot_readings(metric_type, time DESC);
