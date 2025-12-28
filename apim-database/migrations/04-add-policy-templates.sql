-- Migration: Add Policy Templates Configuration
-- Purpose: Store policy templates in DB (not hardcoded in UI)
-- Benefit: Add/modify templates without frontend redeployment

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

-- Index for fast queries
CREATE INDEX idx_policy_templates_section ON policy_templates(section, is_active);
CREATE INDEX idx_policy_templates_category ON policy_templates(category, is_active);

-- Template Schema Example:
-- {
--   "fields": [
--     {
--       "name": "allowedOrigins",
--       "label": "Allowed Origins",
--       "type": "array",
--       "required": true,
--       "placeholder": "https://app.company.com",
--       "defaultValue": ["*"]
--     }
--   ],
--   "xmlTemplate": "<cors>\n    <allowed-origins>\n        <origin>{{allowedOrigins}}</origin>\n    </allowed-origins>\n</cors>"
-- }

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

COMMENT ON TABLE policy_templates IS 'Backend-driven policy templates - modify without UI redeployment';
COMMENT ON COLUMN policy_templates.template_schema IS 'JSON schema with fields + xmlTemplate using Handlebars syntax';
