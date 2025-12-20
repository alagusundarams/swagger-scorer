-- Design principles:
-- 1. Golden records - authoritative source of truth
-- 2. Denormalized where needed for query performance
-- 3. JSONB for flexible metadata
-- 4. Environment-scoped where applicable

-- =============================================================================
-- CLEAN SLATE (DROP EVERYTHING)
-- =============================================================================

DROP VIEW IF EXISTS subscriptions_with_details CASCADE;
DROP VIEW IF EXISTS products_with_teams CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS approval_requests CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS operations CASCADE;
DROP TABLE IF EXISTS apis CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS user_teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- =============================================================================
-- TEAMS
-- =============================================================================

CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    azure_ad_group_id TEXT UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('producer', 'consumer', 'both')),
    description TEXT,
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
    version TEXT NOT NULL,
    description TEXT,
    state TEXT NOT NULL CHECK (state IN ('published', 'notPublished')),
    
    -- Owner team (NULLABLE - no teams initially)
    owner_team_id TEXT REFERENCES teams(id),  -- Removed NOT NULL
    
    environment TEXT NOT NULL CHECK (environment IN ('DEV', 'QA', 'STAGE', 'PROD')),
    
    -- Visibility and authorization
    visibility TEXT CHECK (visibility IN ('public', 'internal', 'private', 'owner-only')) DEFAULT 'internal',
    authorized_teams JSONB, -- Array of team IDs per environment: {"DEV": ["team1"], "PROD": ["team2"]}
    
    -- Management mode (ALL start as TERRAFORM_MANAGED)
    management_mode TEXT CHECK (management_mode IN ('TERRAFORM_MANAGED', 'HYBRID', 'PORTAL_MANAGED')) DEFAULT 'TERRAFORM_MANAGED',
    terraform_pipeline_url TEXT,
    
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
    apim_raw_data JSONB
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
-- VIEWS FOR COMMON QUERIES
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
