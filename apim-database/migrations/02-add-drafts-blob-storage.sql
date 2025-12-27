-- Migration: 02-add-drafts-blob-storage.sql
-- Purpose: Add tables for draft file management and blob storage tracking

-- =============================================================================
-- DRAFTS TABLE
-- Purpose: Track draft files (contracts, policies, configs) before approval
-- =============================================================================

CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Ownership
    user_id TEXT REFERENCES users(id) NOT NULL,
    
    -- File Details
    blob_url TEXT NOT NULL,  -- Path to file in blob storage (or local folder for Day 1)
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('contract', 'policy', 'config', 'other')),
    file_size_bytes INTEGER,
    mime_type TEXT,
    
    -- Lifecycle
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,  -- Set by trigger to uploaded_at + 7 days
    status TEXT CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'archived')) DEFAULT 'draft',
    
    -- Optional: Link to approval if this becomes part of a request
    approval_request_id TEXT REFERENCES approval_requests(id),
    
    -- Context: What is this draft for?
    product_id TEXT REFERENCES products(id),
    api_id TEXT REFERENCES apis(id),
    context_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_drafts_user ON drafts(user_id);
CREATE INDEX idx_drafts_expires ON drafts(expires_at);
CREATE INDEX idx_drafts_status ON drafts(status);
CREATE INDEX idx_drafts_approval ON drafts(approval_request_id);
CREATE INDEX idx_drafts_product ON drafts(product_id);

COMMENT ON TABLE drafts IS 'Tracks draft files before approval and deployment';
COMMENT ON COLUMN drafts.blob_url IS 'Path to file in blob storage (CSI driver) or local folder';
COMMENT ON COLUMN drafts.expires_at IS 'Auto-generated: 7 days after upload for automatic cleanup';

-- =============================================================================
-- BLOB HISTORY TABLE
-- Purpose: Audit trail for all blob storage operations
-- =============================================================================

CREATE TABLE IF NOT EXISTS blob_history (
    id SERIAL PRIMARY KEY,
    
    -- What happened
    blob_url TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('uploaded', 'accessed', 'downloaded', 'deleted', 'expired')),
    
    -- Who did it
    user_id TEXT REFERENCES users(id),  -- NULL if system action (e.g., auto-cleanup)
    
    -- When
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    draft_id TEXT,  -- Reference to drafts.id (not FK because draft may be deleted)
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT
);

CREATE INDEX idx_blob_history_timestamp ON blob_history(timestamp DESC);
CREATE INDEX idx_blob_history_blob_url ON blob_history(blob_url);
CREATE INDEX idx_blob_history_user ON blob_history(user_id);
CREATE INDEX idx_blob_history_action ON blob_history(action);

COMMENT ON TABLE blob_history IS 'Complete audit trail of all blob storage operations';
COMMENT ON COLUMN blob_history.user_id IS 'NULL for system actions like auto-cleanup';

-- =============================================================================
-- HELPER FUNCTION: Log blob action
-- =============================================================================

CREATE OR REPLACE FUNCTION log_blob_action(
    p_blob_url TEXT,
    p_action TEXT,
    p_user_id TEXT DEFAULT NULL,
    p_draft_id TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO blob_history (blob_url, action, user_id, draft_id, notes)
    VALUES (p_blob_url, p_action, p_user_id, p_draft_id, p_notes);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGER: Auto-set expiration date
-- =============================================================================

CREATE OR REPLACE FUNCTION set_draft_expiration()
RETURNS TRIGGER AS $$
BEGIN
    NEW.expires_at := NEW.uploaded_at + INTERVAL '7 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_draft_insert_set_expiration
    BEFORE INSERT ON drafts
    FOR EACH ROW
    EXECUTE FUNCTION set_draft_expiration();

-- =============================================================================
-- TRIGGER: Auto-log draft creation
-- =============================================================================

CREATE OR REPLACE FUNCTION draft_created_trigger()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_blob_action(NEW.blob_url, 'uploaded', NEW.user_id, NEW.id, 'Draft created');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_draft_created
    AFTER INSERT ON drafts
    FOR EACH ROW
    EXECUTE FUNCTION draft_created_trigger();

-- =============================================================================
-- VIEW: Expired drafts ready for cleanup
-- =============================================================================

CREATE OR REPLACE VIEW expired_drafts AS
SELECT 
    id,
    user_id,
    blob_url,
    file_name,
    file_type,
    uploaded_at,
    expires_at,
    EXTRACT(EPOCH FROM (NOW() - expires_at))/3600 as hours_expired
FROM drafts
WHERE expires_at < NOW()
AND status != 'archived'
ORDER BY expires_at ASC;

COMMENT ON VIEW expired_drafts IS 'Drafts that have exceeded 7-day TTL and are ready for cleanup';
