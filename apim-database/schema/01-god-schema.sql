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
CREATE INDEX idx_users_team ON users(default_team_id);

-- =============================================================================
-- PRODUCTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    terms TEXT,
    subscription_required BOOLEAN DEFAULT TRUE,
    approval_required BOOLEAN DEFAULT FALSE,
    subscriptions_limit INTEGER,
    state TEXT CHECK (state IN ('notPublished', 'published')) DEFAULT 'published',
    owner_team_id TEXT REFERENCES teams(id),
    environment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, environment)
);

CREATE INDEX idx_products_owner ON products(owner_team_id);
CREATE INDEX idx_products_env ON products(environment);
CREATE INDEX idx_products_state ON products(state);

-- =============================================================================
-- APIS
-- =============================================================================

CREATE TABLE IF NOT EXISTS apis (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    service_url TEXT,
    product_id TEXT NOT NULL,
    path TEXT,
    protocols TEXT[],
    is_current BOOLEAN DEFAULT TRUE,
    revision TEXT,
    subscription_required BOOLEAN DEFAULT TRUE,
    subscription_key_param_names_header TEXT[],
    subscription_key_param_names_query TEXT[],
    environment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, environment),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_apis_product ON apis(product_id);
CREATE INDEX idx_apis_env ON apis(environment);
CREATE INDEX idx_apis_current ON apis(is_current);

-- =============================================================================
-- SUBSCRIPTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    name TEXT,
    display_name TEXT,
    owner_id TEXT,
    scope TEXT,
    state TEXT CHECK (state IN ('submitted', 'active', 'suspended', 'rejected', 'cancelled', 'expired')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    start_date TIMESTAMP WITH TIME ZONE,
    expiration_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    notification_date TIMESTAMP WITH TIME ZONE,
    state_comment TEXT,
    primary_key TEXT,
    secondary_key TEXT,
    allow_tracing BOOLEAN DEFAULT FALSE,
    product_id TEXT NOT NULL,
    subscriber_team_id TEXT REFERENCES teams(id),
    environment TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_product ON subscriptions(product_id);
CREATE INDEX idx_subscriptions_team ON subscriptions(subscriber_team_id);
CREATE INDEX idx_subscriptions_state ON subscriptions(state);
CREATE INDEX idx_subscriptions_env ON subscriptions(environment);

-- =============================================================================
-- NAMED VALUES
-- =============================================================================

CREATE TABLE IF NOT EXISTS named_values (
    id TEXT PRIMARY KEY,
    system_name TEXT NOT NULL,
    display_name TEXT,
    value TEXT,
    tags TEXT[],
    is_secret BOOLEAN DEFAULT FALSE,
    scope TEXT,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    environment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(system_name, environment)
);

CREATE INDEX idx_named_values_product ON named_values(product_id);
CREATE INDEX idx_named_values_env ON named_values(environment);
CREATE INDEX idx_named_values_secret ON named_values(is_secret);

-- =============================================================================
-- GOVERNANCE BACKENDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS governance_backends (
    id TEXT PRIMARY KEY,
    title TEXT,
    description TEXT,
    url TEXT NOT NULL,
    protocol TEXT CHECK (protocol IN ('http', 'soap')) DEFAULT 'http',
    credentials JSONB,
    proxy JSONB,
    tls JSONB,
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    scope TEXT,
    environment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(title, environment)
);

CREATE INDEX idx_governance_backends_product ON governance_backends(product_id);
CREATE INDEX idx_governance_backends_env ON governance_backends(environment);

-- =============================================================================
-- API-BACKEND MAPPINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_backends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_id TEXT NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
    backend_id TEXT NOT NULL REFERENCES governance_backends(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(api_id, backend_id)
);

CREATE INDEX idx_api_backends_api ON api_backends(api_id);
CREATE INDEX idx_api_backends_backend ON api_backends(backend_id);

-- =============================================================================
-- POLICY TEMPLATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS policy_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    xml_template TEXT NOT NULL,
    parameters JSONB,
    scope TEXT CHECK (scope IN ('product', 'api', 'operation')) DEFAULT 'api',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_policy_templates_category ON policy_templates(category);
CREATE INDEX idx_policy_templates_active ON policy_templates(is_active);

-- =============================================================================
-- ORPHAN TRACKING TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS apim_orphan_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    environment TEXT NOT NULL,
    state TEXT,
    owner_team_id TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apim_orphan_products_env ON apim_orphan_products(environment);
CREATE INDEX IF NOT EXISTS idx_apim_orphan_products_updated ON apim_orphan_products(updated_at DESC);

CREATE TABLE IF NOT EXISTS apim_orphan_subscriptions (
    id TEXT PRIMARY KEY,
    name TEXT,
    display_name TEXT,
    state TEXT,
    product_id TEXT,
    environment TEXT NOT NULL,
    subscriber_team_id TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apim_orphan_subscriptions_env ON apim_orphan_subscriptions(environment);
CREATE INDEX IF NOT EXISTS idx_apim_orphan_subscriptions_product ON apim_orphan_subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_apim_orphan_subscriptions_updated ON apim_orphan_subscriptions(updated_at DESC);

CREATE TABLE IF NOT EXISTS apim_orphan_named_values (
    id TEXT PRIMARY KEY,
    system_name TEXT NOT NULL,
    display_name TEXT,
    value TEXT,
    is_secret BOOLEAN DEFAULT FALSE,
    scope TEXT,
    environment TEXT NOT NULL,
    product_id TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apim_orphan_named_values_env ON apim_orphan_named_values(environment);
CREATE INDEX IF NOT EXISTS idx_apim_orphan_named_values_scope ON apim_orphan_named_values(scope);
CREATE INDEX IF NOT EXISTS idx_apim_orphan_named_values_updated ON apim_orphan_named_values(updated_at DESC);

CREATE TABLE IF NOT EXISTS apim_orphan_backends (
    id TEXT PRIMARY KEY,
    title TEXT,
    url TEXT NOT NULL,
    protocol TEXT,
    scope TEXT,
    environment TEXT NOT NULL,
    product_id TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apim_orphan_backends_env ON apim_orphan_backends(environment);
CREATE INDEX IF NOT EXISTS idx_apim_orphan_backends_scope ON apim_orphan_backends(scope);
CREATE INDEX IF NOT EXISTS idx_apim_orphan_backends_updated ON apim_orphan_backends(updated_at DESC);

-- =============================================================================
-- AUDIT LOG (Compliance & Security)
-- =============================================================================

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

COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all sensitive operations (deletes, key reads, bulk ops)';
COMMENT ON COLUMN audit_log.details IS 'JSONB: { reason, snapshot, count, requestId, requestedBy, environment, etc }';

-- =============================================================================
-- SAMPLE DATA
-- =============================================================================

-- Insert sample teams
INSERT INTO teams (id, name, azure_ad_group_id, type, description) VALUES
('team-platform', 'Platform Team', 'ENV_APIM_Platform', 'producer', 'Core platform services'),
('team-mobile', 'Mobile Team', 'ENV_APIM_Mobile', 'consumer', 'Mobile app development'),
('team-web', 'Web Team', 'ENV_APIM_Web', 'both', 'Web application team'),
('team-legacy', 'Legacy Services', NULL, 'producer', 'Legacy system migrations');

-- Insert sample policy templates
INSERT INTO policy_templates (name, display_name, description, category, xml_template, scope, usage_count) VALUES
(
    'rate-limit-by-key',
    'Rate Limit by Key',
    'Limits the rate of calls based on a specific key',
    'security',
    '<rate-limit-by-key calls="{{calls}}" renewal-period="{{period}}" counter-key="{{counterKey}}" />',
    'api',
    15
),
(
    'cors',
    'CORS Policy',
    'Cross-Origin Resource Sharing configuration',
    'security',
    '<cors><allowed-origins><origin>{{origin}}</origin></allowed-origins></cors>',
    'api',
    8
),
(
    'validate-jwt',
    'Validate JWT Token',
    'Validates JSON Web Tokens',
    'security',
    '<validate-jwt header-name="Authorization" failed-validation-httpcode="401" />',
    'api',
    12
),
(
    'ip-filter',
    'IP Filter',
    'Restrict access based on IP addresses',
    'security',
    '<ip-filter action="{{action}}"><address>{{ipAddress}}</address></ip-filter>',
    'product',
    6
),
(
    'set-backend-service',
    'Set Backend Service',
    'Dynamically set backend service URL',
    'transformation',
    '<set-backend-service base-url="{{backendUrl}}" />',
    'api',
    5
 ),
(
    'cache-lookup',
    'Cache Lookup',
    'Look up response from cache',
    'performance',
    '<cache-lookup vary-by-developer="{{varyByDev}}" vary-by-developer-groups="{{varyByDevGroups}}" downstream-caching-type="{{cachingType}}" />',
    'operation',
    3
);

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

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
