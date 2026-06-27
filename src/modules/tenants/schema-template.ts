/**
 * Per-tenant schema SQL template.
 *
 * Defines all tables created within a tenant's dedicated PostgreSQL schema.
 * Called during tenant provisioning to set up the isolated data partition.
 *
 * Schema name convention: `tenant_<slug>` (e.g., tenant_villa_sunrise)
 */

/**
 * Generates the SQL for creating a complete per-tenant schema
 * with all domain-specific tables.
 *
 * @param schemaName - The validated schema name (e.g., "tenant_villa_sunrise")
 * @returns SQL string to execute for provisioning the schema
 */
export function generateSchemaSQL(schemaName: string): string {
  return `
-- ══════════════════════════════════════════════════════════════════════
-- Per-Tenant Schema: ${schemaName}
-- ══════════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS ${schemaName};

SET search_path TO ${schemaName};

-- ──────────────────────────────────────────────────────────────────────
-- Room Management
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_occupancy INT NOT NULL DEFAULT 2,
    base_rate NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    amenities JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL REFERENCES room_types(id),
    name VARCHAR(100) NOT NULL,
    floor INT,
    status VARCHAR(20) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'occupied', 'maintenance', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────
-- Rate Plans
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rate_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL REFERENCES room_types(id),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'seasonal'
        CHECK (type IN ('base', 'seasonal', 'promotional')),
    rate NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    min_stay INT NOT NULL DEFAULT 1,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────
-- Bookings and Guests
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    nationality VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'partially_paid', 'paid', 'refunded', 'failed')),
    total_amount NUMERIC(12, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    source VARCHAR(30) DEFAULT 'direct'
        CHECK (source IN ('direct', 'booking_com', 'airbnb', 'expedia', 'manual')),
    special_requests TEXT,
    num_guests INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_dates CHECK (check_out > check_in)
);

CREATE TABLE IF NOT EXISTS guest_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    guest_id UUID NOT NULL REFERENCES guests(id),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email', 'whatsapp', 'telegram')),
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────
-- Staff Operations
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_to UUID NOT NULL,
    assigned_by UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('high', 'medium', 'low')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed')),
    deadline TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    evidence JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    shift_date DATE NOT NULL,
    shift_start TIME NOT NULL,
    clock_in TIMESTAMPTZ,
    clock_out TIMESTAMPTZ,
    status VARCHAR(10) NOT NULL DEFAULT 'absent'
        CHECK (status IN ('present', 'late', 'absent')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role VARCHAR(30) NOT NULL
        CHECK (role IN ('housekeeping', 'maintenance', 'front_desk', 'management')),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(user_id, role)
);

-- ──────────────────────────────────────────────────────────────────────
-- Maintenance
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_by UUID NOT NULL,
    assigned_to UUID,
    severity VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'assigned', 'in_progress', 'completed', 'cancelled')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    photos JSONB DEFAULT '[]',
    cost NUMERIC(12, 2),
    completed_at TIMESTAMPTZ,
    completion_evidence JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recurring_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    interval_days INT NOT NULL CHECK (interval_days BETWEEN 1 AND 365),
    last_completed_at TIMESTAMPTZ,
    next_due_at TIMESTAMPTZ NOT NULL,
    assigned_to UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────
-- Financial
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(30) NOT NULL
        CHECK (category IN ('booking_revenue', 'ota_commission', 'agency_fee', 'operational_cost', 'maintenance_expense')),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    booking_id UUID REFERENCES bookings(id),
    reference_id VARCHAR(255),
    recorded_by UUID,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES financial_transactions(id),
    field_name VARCHAR(100) NOT NULL,
    previous_value TEXT,
    new_value TEXT NOT NULL,
    modified_by UUID NOT NULL,
    modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS villa_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by UUID,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────
-- Marketing
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('meta', 'google', 'direct')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    budget NUMERIC(12, 2),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    start_date DATE,
    end_date DATE,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id),
    date DATE NOT NULL,
    impressions INT NOT NULL DEFAULT 0,
    clicks INT NOT NULL DEFAULT 0,
    cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    conversions INT NOT NULL DEFAULT 0,
    revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, date)
);

-- ──────────────────────────────────────────────────────────────────────
-- IoT and CCTV
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS iot_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL
        CHECK (type IN ('cctv', 'motion', 'door', 'environmental', 'smart_home')),
    location VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'offline'
        CHECK (status IN ('online', 'offline', 'error')),
    config JSONB DEFAULT '{}',
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cctv_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES iot_devices(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    storage_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,
    retention_until TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────
-- Villa Content (Website)
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS villa_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section VARCHAR(50) NOT NULL
        CHECK (section IN ('hero', 'about', 'amenities', 'gallery', 'location', 'policies', 'seo')),
    title VARCHAR(255),
    content TEXT,
    media JSONB DEFAULT '[]',
    sort_order INT NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────
-- Reviews
-- ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    guest_id UUID NOT NULL REFERENCES guests(id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    comment TEXT,
    response TEXT,
    responded_at TIMESTAMPTZ,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════════════

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Guests
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);

-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned_to ON staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_deadline ON staff_tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_user_date ON staff_attendance(user_id, shift_date);

-- Maintenance
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_status ON maintenance_tickets(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tickets_severity ON maintenance_tickets(severity);
CREATE INDEX IF NOT EXISTS idx_recurring_maintenance_due ON recurring_maintenance(next_due_at);

-- Financial
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_booking ON financial_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_trail_tx ON financial_audit_trail(transaction_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_trail_date ON financial_audit_trail(modified_at);

-- Marketing
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_campaign_date ON marketing_metrics(campaign_id, date);

-- IoT
CREATE INDEX IF NOT EXISTS idx_iot_devices_type ON iot_devices(type);
CREATE INDEX IF NOT EXISTS idx_iot_devices_status ON iot_devices(status);
CREATE INDEX IF NOT EXISTS idx_cctv_recordings_device ON cctv_recordings(device_id, start_time);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_guest ON reviews(guest_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Reset search path
SET search_path TO public;
`;
}
