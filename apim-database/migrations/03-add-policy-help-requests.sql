-- Migration: 03-add-policy-help-requests.sql
-- Purpose: Add tables for policy help request system

-- =============================================================================
-- POLICY HELP REQUESTS TABLE
-- Purpose: Track help requests from teams to APIM DEV team
-- =============================================================================

CREATE TABLE IF NOT EXISTS policy_help_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Requester Information
    user_id TEXT REFERENCES users(id) NOT NULL,
    team_id TEXT REFERENCES teams(id) NOT NULL,
    
    -- Context
    product_id TEXT REFERENCES products(id),
    api_id TEXT REFERENCES apis(id),
    policy_xml TEXT,
    
    -- Request Details
    issue_description TEXT NOT NULL,
    status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT REFERENCES users(id)
);

CREATE INDEX idx_policy_help_user ON policy_help_requests(user_id);
CREATE INDEX idx_policy_help_team ON policy_help_requests(team_id);
CREATE INDEX idx_policy_help_status ON policy_help_requests(status);
CREATE INDEX idx_policy_help_created ON policy_help_requests(created_at DESC);

COMMENT ON TABLE policy_help_requests IS 'Help requests from teams to APIM DEV team for policy assistance';
COMMENT ON COLUMN policy_help_requests.policy_xml IS 'Policy XML that user needs help with (optional)';

-- =============================================================================
-- POLICY HELP MESSAGES TABLE
-- Purpose: Communication thread for help requests
-- =============================================================================

CREATE TABLE IF NOT EXISTS policy_help_messages (
    id SERIAL PRIMARY KEY,
    
    -- References
    request_id TEXT REFERENCES policy_help_requests(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT REFERENCES users(id) NOT NULL,
    
    -- Message Content
    message TEXT NOT NULL,
    is_apim_dev BOOLEAN DEFAULT false,  -- True if message is from APIM DEV team
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_help_messages_request ON policy_help_messages(request_id);
CREATE INDEX idx_help_messages_created ON policy_help_messages(created_at DESC);

COMMENT ON TABLE policy_help_messages IS 'Message thread for policy help requests';
COMMENT ON COLUMN policy_help_messages.is_apim_dev IS 'True if sender has super_admin role';

-- =============================================================================
-- TRIGGER: Auto-update updated_at on status change
-- =============================================================================

CREATE OR REPLACE FUNCTION update_help_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
        NEW.resolved_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_help_request_update
    BEFORE UPDATE ON policy_help_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_help_request_timestamp();

-- =============================================================================
-- VIEW: Open help requests for APIM DEV team
-- =============================================================================

CREATE OR REPLACE VIEW open_help_requests AS
SELECT 
    h.id,
    h.user_id,
    h.team_id,
    h.product_id,
    h.api_id,
    h.issue_description,
    h.priority,
    h.status,
    h.created_at,
    u.name as requester_name,
    t.display_name as team_name,
    (SELECT COUNT(*) FROM policy_help_messages WHERE request_id = h.id) as message_count,
    (SELECT MAX(created_at) FROM policy_help_messages WHERE request_id = h.id) as last_message_at
FROM policy_help_requests h
LEFT JOIN users u ON h.user_id = u.id
LEFT JOIN teams t ON h.team_id = t.id
WHERE h.status IN ('open', 'in_progress')
ORDER BY h.priority DESC, h.created_at ASC;

COMMENT ON VIEW open_help_requests IS 'Active help requests awaiting APIM DEV team response';
