-- =============================================================================
-- NUCLEAR RESET (DROP EVERYTHING)
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Design principles:
-- 1. Golden records - authoritative source of truth
-- 2. Denormalized where needed for query performance
-- 3. JSONB for flexible metadata
-- 4. Environment-scoped where applicable

-- =============================================================================
-- TEAMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    azure_ad_group_id TEXT UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('producer', 'consumer', 'both')) DEFAULT 'both',
    description TEXT,
    contact_email TEXT,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teams_type ON teams(type);
CREATE INDEX idx_teams_azure_ad ON teams(azure_ad_group_id);

-- =============================================================================
-- USERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    azure_ad_object_id TEXT UNIQUE NOT NULL,
    default_team_id TEXT REFERENCES teams(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_azure_ad ON users(azure_ad_object_id);

-- User team memberships (many-to-many)
CREATE TABLE IF NOT EXISTS user_teams (
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
    is_lead BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, team_id)
);

CREATE INDEX idx_user_teams_team ON user_teams(team_id);
CREATE INDEX idx_user_teams_leads ON user_teams(is_lead) WHERE is_lead = TRUE;

-- =============================================================================
-- PRODUCTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    version TEXT,  -- Made nullable - APIM products don't have version field
    description TEXT,
    state TEXT NOT NULL CHECK (state IN ('published', 'notPublished')),
    
    -- Owner team (NULLABLE - no teams initially)
    owner_team_id TEXT REFERENCES teams(id),  -- Removed NOT NULL
    
    environment TEXT NOT NULL CHECK (environment IN ('DEV', 'QA', 'STAGE', 'PROD')),
    region TEXT DEFAULT 'Global',
    
    -- Visibility and authorization
    visibility TEXT CHECK (visibility IN ('public', 'internal', 'private', 'owner-only')) DEFAULT 'internal',
    authorized_teams JSONB, -- Array of team IDs per environment: {"DEV": ["team1"], "PROD": ["team2"]}
    
    -- Management mode (ALL start as TERRAFORM_MANAGED)
    management_mode TEXT CHECK (management_mode IN ('TERRAFORM_MANAGED', 'HYBRID', 'PORTAL_MANAGED')) DEFAULT 'TERRAFORM_MANAGED',
    terraform_pipeline_url TEXT,
    github_url TEXT,
    
    -- Git repository (varies by environment)
    git_repo_url TEXT,  -- Main repo URL (DEV/QA/STAGE share one)
    git_file_path TEXT, -- Path to contract file in repo
    git_prod_repo_url TEXT,  -- Separate PROD repo if different
    git_prod_file_path TEXT, -- PROD file path if different
    
    -- Linked identity (App Registration)
    identity_client_id TEXT,
    identity_display_name TEXT,
    identity_app_id_uri TEXT,
    
    -- Metrics
    subscriber_count INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2), -- 0.00 to 100.00
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- APIM source data (for audit/troubleshooting)
    apim_raw_data JSONB,

    -- Deployment Tracking (Git Sync)
    last_deployed_commit_hash TEXT,
    last_deployed_at TIMESTAMP WITH TIME ZONE,
    
    -- Universal Chain Visibility (Updated by all workers to enable comparison views)
    dev_deployment_date TIMESTAMP WITH TIME ZONE,
    dev_hash TEXT,
    qa_deployment_date TIMESTAMP WITH TIME ZONE,
    qa_hash TEXT,
    stage_deployment_date TIMESTAMP WITH TIME ZONE,
    stage_hash TEXT,
    production_deployment_date TIMESTAMP WITH TIME ZONE,
    production_hash TEXT,
    
    -- Governance Intelligence
    detected_anomalies JSONB -- e.g. ["MANUAL_CREATION", "ENV_SKIP", "UNOWNED"]
);

CREATE INDEX idx_products_owner ON products(owner_team_id);
CREATE INDEX idx_products_environment ON products(environment);
CREATE INDEX idx_products_state ON products(state);
CREATE INDEX idx_products_management_mode ON products(management_mode);
CREATE INDEX idx_products_quality ON products(quality_score);
CREATE INDEX idx_products_git_repo ON products(git_repo_url);

-- =============================================================================
-- APIS
-- =============================================================================

CREATE TABLE IF NOT EXISTS apis (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    path TEXT NOT NULL,
    quality_score DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- APIM source data
    apim_raw_data JSONB
);

CREATE INDEX idx_apis_product ON apis(product_id);
CREATE INDEX idx_apis_quality ON apis(quality_score);

-- =============================================================================
-- OPERATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS operations (
    id TEXT PRIMARY KEY,
    api_id TEXT REFERENCES apis(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS')),
    url_template TEXT NOT NULL,
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_operations_api ON operations(api_id);
CREATE INDEX idx_operations_method ON operations(method);

-- =============================================================================
-- SUBSCRIPTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    subscriber_team_id TEXT REFERENCES teams(id) NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('active', 'suspended', 'submitted', 'pending', 'rejected', 'cancelled', 'expired')),
    
    -- Keys
    primary_key_name TEXT,
    primary_key_value TEXT, -- Encrypted in production
    secondary_key_name TEXT,
    secondary_key_value TEXT, -- Encrypted in production
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE,
    
    -- APIM source data
    apim_raw_data JSONB
);

CREATE INDEX idx_subscriptions_product ON subscriptions(product_id);
CREATE INDEX idx_subscriptions_team ON subscriptions(subscriber_team_id);
CREATE INDEX idx_subscriptions_state ON subscriptions(state);

-- =============================================================================
-- APPROVAL REQUESTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS approval_requests (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN (
        'PRODUCT_ONBOARDING',
        'API_ONBOARDING',
        'MODIFICATION',
        'SUBSCRIPTION',
        'PROMOTION_REQUEST',
        'QUOTA_EXTENSION',
        'DEPRECATION_REQUEST'
    )),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
    
    -- Requester info
    requester_name TEXT NOT NULL,
    requester_email TEXT NOT NULL,
    requester_team_id TEXT REFERENCES teams(id) NOT NULL,
    
    -- Request details (flexible JSONB for different request types)
    details JSONB NOT NULL,
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT
);

CREATE INDEX idx_approvals_status ON approval_requests(status);
CREATE INDEX idx_approvals_type ON approval_requests(type);
CREATE INDEX idx_approvals_team ON approval_requests(requester_team_id);

-- =============================================================================
-- AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    entity_type TEXT NOT NULL, -- 'product', 'api', 'subscription', etc.
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'deployed'
    user_id TEXT REFERENCES users(id),
    changes JSONB, -- Before/after snapshot
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);

-- =============================================================================
-- APP REGISTRATIONS (Linked Identities)
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_registrations (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    display_name TEXT NOT NULL, -- Resolved from Graph or 'KeyVault:...'
    environment TEXT NOT NULL,
    product_id TEXT REFERENCES products(id),
    owner_team_id TEXT REFERENCES teams(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_app_reg_client_id ON app_registrations(client_id);

-- =============================================================================
-- BACKENDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS governance_backends (
    id TEXT NOT NULL,
    environment TEXT NOT NULL,
    url TEXT,
    description TEXT,
    title TEXT,
    resource_id TEXT,
    protocol TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, environment)
);

CREATE TABLE IF NOT EXISTS api_backends (
    api_id TEXT, -- Note: can't always guarantee api_id matches our DB id yet
    backend_id TEXT,
    environment TEXT,
    PRIMARY KEY (api_id, backend_id, environment)
);

-- =============================================================================
-- ACCESS CONTROL LISTS (Named Values / Config) - LEGACY
-- Note: Kept for backward compat if needed, but 'named_values' is the new standard
-- =============================================================================

CREATE TABLE IF NOT EXISTS access_control_lists (
    key TEXT NOT NULL,
    environment TEXT NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (key, environment)
);

-- =============================================================================
-- NAMED VALUES (NEW STANDARD)
-- Replaces usage of access_control_lists for APIM Configurations
-- =============================================================================

CREATE TABLE IF NOT EXISTS named_values (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    scope_id TEXT, -- Null for Product Level, API ID for API Scope
    display_name TEXT NOT NULL,
    system_name TEXT NOT NULL,
    value TEXT NOT NULL,
    type TEXT CHECK (type IN ('literal', 'key_vault')),
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, system_name, scope_id)
);

-- =============================================================================
-- PERMISSION MATRIX (RBAC)
-- Enforces Team Roles (Owner/Contributor/Reader) per Environment
-- =============================================================================

CREATE TABLE IF NOT EXISTS permission_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL, -- Logical ID (e.g. prod-001 or unique-guid)
    ad_group_id TEXT NOT NULL,
    environment TEXT NOT NULL,
    role TEXT CHECK (role IN ('Reader', 'Contributor', 'Owner')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, ad_group_id, environment)
);

-- =============================================================================
-- DRAFTS (From Migration 02)
-- Tracks draft files before approval
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

-- =============================================================================
-- BLOB HISTORY (From Migration 02)
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

-- =============================================================================
-- POLICY HELP REQUESTS (From Migration 03)
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

-- =============================================================================
-- POLICY TEMPLATES (From Migration 04)
-- =============================================================================

CREATE TABLE IF NOT EXISTS policy_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('security', 'transformation', 'traffic', 'backend')),
    section TEXT NOT NULL CHECK (section IN ('inbound', 'backend', 'outbound', 'on-error')),
    
    -- Template definition as JSON
    template_schema JSONB NOT NULL,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_policy_templates_section ON policy_templates(section, is_active);
CREATE INDEX idx_policy_templates_category ON policy_templates(category, is_active);

-- Seed data: CORS Policy
INSERT INTO policy_templates (id, name, description, category, section, template_schema, display_order) VALUES
(
    'cors',
    'CORS',
    'Enable Cross-Origin Resource Sharing',
    'security',
    'inbound',
    '{
        "fields": [
            {
                "name": "allowedOrigins",
                "label": "Allowed Origins",
                "type": "array",
                "required": true,
                "placeholder": "https://app.company.com",
                "defaultValue": ["*"]
            },
            {
                "name": "allowedMethods",
                "label": "Allowed Methods",
                "type": "select",
                "options": [
                    {"value": "GET,POST,PUT,DELETE", "label": "All (GET, POST, PUT, DELETE)"},
                    {"value": "GET,POST", "label": "GET, POST"},
                    {"value": "GET", "label": "GET only"}
                ],
                "defaultValue": "GET,POST,PUT,DELETE"
            }
        ],
        "xmlTemplate": "<cors>\n    <allowed-origins>\n        <origin>{{allowedOrigins}}</origin>\n    </allowed-origins>\n    <allowed-methods>\n        {{#each allowedMethods}}<method>{{this}}</method>{{/each}}\n    </allowed-methods>\n</cors>"
    }'::jsonb,
    1
);

-- Seed data: Rate Limiting
INSERT INTO policy_templates (id, name, description, category, section, template_schema, display_order) VALUES
(
    'rate-limit',
    'Rate Limiting',
    'Limit API call rate',
    'traffic',
    'inbound',
    '{
        "fields": [
            {
                "name": "calls",
                "label": "Max Calls",
                "type": "number",
                "required": true,
                "defaultValue": 100
            },
            {
                "name": "renewalPeriod",
                "label": "Period (seconds)",
                "type": "number",
                "required": true,
                "defaultValue": 60
            }
        ],
        "xmlTemplate": "<rate-limit calls=\"{{calls}}\" renewal-period=\"{{renewalPeriod}}\" />"
    }'::jsonb,
    2
);

-- Seed data: Set Header
INSERT INTO policy_templates (id, name, description, category, section, template_schema, display_order) VALUES
(
    'set-header',
    'Set Header',
    'Add or modify HTTP header',
    'transformation',
    'inbound',
    '{
        "fields": [
            {
                "name": "headerName",
                "label": "Header Name",
                "type": "text",
                "required": true,
                "placeholder": "X-Custom-Header"
            },
            {
                "name": "headerValue",
                "label": "Header Value",
                "type": "text",
                "required": true,
                "placeholder": "custom-value"
            },
            {
                "name": "action",
                "label": "Action",
                "type": "select",
                "options": [
                    {"value": "override", "label": "Override (replace if exists)"},
                    {"value": "skip", "label": "Skip (add only if not exists)"},
                    {"value": "append", "label": "Append (add to existing)"},
                    {"value": "delete", "label": "Delete"}
                ],
                "defaultValue": "override"
            }
        ],
        "xmlTemplate": "{{#if (eq action \"delete\")}}<set-header name=\"{{headerName}}\" exists-action=\"delete\" />{{else}}<set-header name=\"{{headerName}}\" exists-action=\"{{action}}\">\n    <value>{{headerValue}}</value>\n</set-header>{{/if}}"
    }'::jsonb,
    3
);

-- Seed data: JWT Validation
INSERT INTO policy_templates (id, name, description, category, section, template_schema, display_order) VALUES
(
    'jwt-validation',
    'Validate JWT',
    'Validate JWT token',
    'security',
    'inbound',
    '{
        "fields": [
            {
                "name": "headerName",
                "label": "Header Name",
                "type": "text",
                "defaultValue": "Authorization",
                "required": true
            },
            {
                "name": "requiredClaims",
                "label": "Required Claims (comma-separated)",
                "type": "text",
                "placeholder": "iss,sub,aud,exp",
                "defaultValue": "iss,sub,aud,exp"
            }
        ],
        "xmlTemplate": "<validate-jwt header-name=\"{{headerName}}\">\n    <required-claims>\n        {{#each claimsArray}}<claim name=\"{{this}}\" />{{/each}}\n    </required-claims>\n</validate-jwt>"
    }'::jsonb,
    4
);

-- Seed data: Backend Routing
INSERT INTO policy_templates (id, name, description, category, section, template_schema, display_order) VALUES
(
    'set-backend',
    'Set Backend Service',
    'Route to backend URL',
    'backend',
    'backend',
    '{
        "fields": [
            {
                "name": "backendUrl",
                "label": "Backend URL",
                "type": "text",
                "required": true,
                "placeholder": "https://backend.company.com"
            }
        ],
        "xmlTemplate": "<set-backend-service base-url=\"{{backendUrl}}\" />"
    }'::jsonb,
    5
);

-- =============================================================================
-- VIEWS FOR COMMON QUERIES (Updated with all dependencies)
-- =============================================================================

-- Products with owner team info
CREATE OR REPLACE VIEW products_with_teams AS
SELECT 
    p.*,
    t.name as owner_team_name,
    t.type as owner_team_type,
    (SELECT COUNT(*) FROM apis WHERE product_id = p.id) as api_count
FROM products p
LEFT JOIN teams t ON p.owner_team_id = t.id;

-- Subscriptions with product and team info
CREATE OR REPLACE VIEW subscriptions_with_details AS
SELECT 
    s.*,
    p.display_name as product_name,
    p.environment as product_environment,
    t.name as subscriber_team_name
FROM subscriptions s
LEFT JOIN products p ON s.product_id = p.id
LEFT JOIN teams t ON s.subscriber_team_id = t.id;

-- Product Backends Hierarchical View
CREATE OR REPLACE VIEW product_backends_view AS
SELECT DISTINCT
    p.id as product_id,
    p.name as product_name,
    p.display_name as product_display_name,
    p.environment,
    b.id as backend_id,
    b.url as backend_url,
    b.title as backend_title,
    b.protocol
FROM products p
JOIN apis a ON a.product_id = p.id
JOIN api_backends ab ON ab.api_id = a.id
JOIN governance_backends b ON b.id = ab.backend_id AND b.environment = p.environment;
