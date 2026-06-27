-- ══════════════════════════════════════════════════════════════════════
-- Audit security: create a restricted role for application access
-- The audit_logs and event_store tables are append-only by design.
-- Revoke UPDATE and DELETE from the application role to enforce immutability.
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Create app role if not exists
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'arka_app') THEN
        CREATE ROLE arka_app WITH LOGIN PASSWORD 'app_password_change_me';
    END IF;
END
$$;

-- Grant general usage
GRANT USAGE ON SCHEMA public TO arka_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO arka_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO arka_app;

-- Revoke UPDATE and DELETE on append-only tables
REVOKE UPDATE, DELETE ON audit_logs FROM arka_app;
REVOKE UPDATE, DELETE ON event_store FROM arka_app;

-- Ensure future tables get default grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO arka_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO arka_app;
