-- Migration: Add audit logging and soft delete support
-- Created: 2026-01-06
-- Description: Adds comprehensive audit logging table and soft delete columns to all resource tables

-- =====================================================
-- AUDIT LOG TABLE (Partitioned by year for scalability)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User information
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,                    -- 'admin', 'producer', 'consumer'
    
    -- Action details
    action VARCHAR(50) NOT NULL,                       -- 'DELETE', 'READ_KEYS', 'READ_SECRET', 'BULK_DELETE', 'BULK_ASSIGN'
    resource_type VARCHAR(50) NOT NULL,                -- 'product', 'subscription', 'named_value', 'backend'
    resource_id VARCHAR(255) NOT NULL,
    resource_name VARCHAR(255),
    
    -- Additional metadata
    details JSONB,                                     -- Action-specific data (reason, snapshot, etc)
    ip_address VARCHAR(45),                            -- IPv4 or IPv6
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common audit queries
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_log(user_id, action, created_at DESC);

-- Comment for documentation
COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all sensitive operations. Partitioned yearly for scalability.';
COMMENT ON COLUMN audit_log.details IS 'JSONB field containing: { reason, snapshot, count, environment, etc }';

-- =====================================================
-- SOFT DELETE COLUMNS
-- =====================================================

-- Products table
ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_products_active ON products(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted_at) WHERE deleted_at IS NOT NULL;

-- Subscriptions table
ALTER TABLE subscriptions 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_deleted ON subscriptions(deleted_at) WHERE deleted_at IS NOT NULL;

-- Named values table
ALTER TABLE named_values 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_named_values_active ON named_values(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_named_values_deleted ON named_values(deleted_at) WHERE deleted_at IS NOT NULL;

-- Backends table
ALTER TABLE backends 
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_backends_active ON backends(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_backends_deleted ON backends(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('20260106_audit_and_soft_delete', 'Add audit logging and soft delete support', NOW())
ON CONFLICT (version) DO NOTHING;
