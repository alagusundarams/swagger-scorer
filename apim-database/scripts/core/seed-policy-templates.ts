import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Get database URL from environment or config
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    // Look for config.json in standard locations (current dir, backend dir, parent dir)
    const configPaths = [
        join(process.cwd(), 'config.json'),
        join(process.cwd(), 'apim-self-service-backend', 'config.json'),
        join(process.cwd(), '..', 'apim-self-service-backend', 'config.json'),
        join(__dirname, '../../config.json')
    ];

    for (const configPath of configPaths) {
        try {
            const config = JSON.parse(readFileSync(configPath, 'utf8'));
            if (config.database?.url) {
                connectionString = config.database.url;
                console.log(`✅ Loaded config from ${configPath}`);
                break;
            }
        } catch (err) {
            // Silent fallback
        }
    }
}

if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable or database.url in config.json is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

const TEMPLATES = [
    {
        "id": "rate-limit",
        "name": "Rate Limit",
        "category": "traffic",
        "intent": "I want to limit the release rate of calls",
        "description": "Throttles calls based on a key (e.g. IP address, User ID).",
        "section": "inbound",
        "tagName": "rate-limit-by-key",
        "displayOrder": 1,
        "templateSchema": {
            "inputs": [
                {
                    "name": "calls",
                    "label": "Number of Calls",
                    "type": "number",
                    "placeholder": "10",
                    "required": true
                },
                {
                    "name": "period",
                    "label": "Time Period (Sec)",
                    "type": "number",
                    "placeholder": "60",
                    "required": true
                },
                {
                    "name": "key",
                    "label": "Counter Key",
                    "type": "text",
                    "default": "@(context.Request.IpAddress)",
                    "placeholder": "@(context.Request.IpAddress)"
                },
                {
                    "name": "remainingCallsHeaderName",
                    "label": "Header: Remaining Calls",
                    "type": "text",
                    "placeholder": "X-RateLimit-Remaining"
                }
            ],
            "xmlTemplate": "<rate-limit-by-key calls=\"{{calls}}\" renewal-period=\"{{period}}\" counter-key=\"{{key}}\" remaining-calls-header-name=\"{{remainingCallsHeaderName}}\" />"
        }
    },
    {
        "id": "mock-response",
        "name": "Mock Response",
        "category": "transformation",
        "intent": "I want to return a static response",
        "description": "Aborts pipeline and returns a mocked response to the caller.",
        "section": "inbound",
        "displayOrder": 20,
        "templateSchema": {
            "inputs": [
                {
                    "name": "code",
                    "label": "Status Code",
                    "type": "number",
                    "default": "200"
                },
                {
                    "name": "contentType",
                    "label": "Content Type",
                    "type": "text",
                    "default": "application/json"
                }
            ],
            "xmlTemplate": "<mock-response status-code=\"{{code}}\" content-type=\"{{contentType}}\" />"
        }
    },
    {
        "id": "rewrite-uri",
        "name": "Rewrite URL",
        "category": "transformation",
        "intent": "I want to change the backend target path",
        "description": "Modifies the request path before sending to the backend.",
        "section": "inbound",
        "displayOrder": 5,
        "templateSchema": {
            "inputs": [
                {
                    "name": "template",
                    "label": "New Path Template",
                    "type": "text",
                    "placeholder": "/v2/api"
                },
                {
                    "name": "copyUnmatchedParams",
                    "label": "Copy Unmatched Query Params",
                    "type": "boolean",
                    "default": "true"
                }
            ],
            "xmlTemplate": "<rewrite-uri template=\"{{template}}\" copy-unmatched-params=\"{{copyUnmatchedParams}}\" />"
        }
    },
    {
        "id": "set-header",
        "name": "Set Header",
        "category": "transformation",
        "intent": "I want to add or modify a header",
        "description": "Sets a request or response header.",
        "section": "inbound",
        "displayOrder": 2,
        "templateSchema": {
            "inputs": [
                {
                    "name": "name",
                    "label": "Header Name",
                    "type": "text",
                    "placeholder": "X-Correlation-ID"
                },
                {
                    "name": "value",
                    "label": "Value",
                    "type": "text",
                    "placeholder": "@(context.RequestId)"
                },
                {
                    "name": "action",
                    "label": "Action",
                    "type": "select",
                    "options": [
                        "override",
                        "skip",
                        "append",
                        "delete"
                    ],
                    "default": "override"
                }
            ],
            "xmlTemplate": "<set-header name=\"{{name}}\" exists-action=\"{{action}}\">\n  <value>{{value}}</value>\n</set-header>"
        }
    },
    {
        "id": "quota",
        "name": "Usage Quota",
        "category": "traffic",
        "intent": "I want to limit the total call volume over a long period",
        "description": "Enforces a renewable call volume/bandwidth quota.",
        "section": "inbound",
        "tagName": "quota-by-key",
        "displayOrder": 3,
        "templateSchema": {
            "inputs": [
                {
                    "name": "calls",
                    "label": "Max Calls",
                    "type": "number",
                    "placeholder": "1000"
                },
                {
                    "name": "bandwidth",
                    "label": "Max Bandwidth (KB)",
                    "type": "number",
                    "placeholder": "10000"
                },
                {
                    "name": "period",
                    "label": "Period (Sec)",
                    "type": "number",
                    "placeholder": "3600"
                },
                {
                    "name": "key",
                    "label": "Counter Key",
                    "type": "text",
                    "default": "@(context.Subscription.Id)"
                }
            ],
            "xmlTemplate": "<quota-by-key calls=\"{{calls}}\" bandwidth=\"{{bandwidth}}\" renewal-period=\"{{period}}\" counter-key=\"{{key}}\" />"
        }
    },
    {
        "id": "set-variable",
        "name": "Set Variable",
        "category": "transformation",
        "intent": "I want to store a value in a variable",
        "description": "Create or update a context variable.",
        "section": "inbound",
        "displayOrder": 15,
        "templateSchema": {
            "inputs": [
                {
                    "name": "name",
                    "label": "Variable Name",
                    "type": "text",
                    "placeholder": "e.g. myVar",
                    "required": true
                },
                {
                    "name": "value",
                    "label": "Value",
                    "type": "text",
                    "placeholder": "e.g. @(context...)",
                    "required": true
                }
            ],
            "xmlTemplate": "<set-variable name=\"{{name}}\" value=\"{{value}}\" />"
        }
    },
    {
        "id": "set-body",
        "name": "Set Body",
        "category": "transformation",
        "intent": "I want to change the message body",
        "description": "Overrides the message body with a new value.",
        "section": "inbound",
        "displayOrder": 16,
        "templateSchema": {
            "inputs": [
                {
                    "name": "body",
                    "label": "Body Content",
                    "type": "textarea",
                    "placeholder": "e.g. { \"status\": \"ok\" }",
                    "required": true
                }
            ],
            "xmlTemplate": "<set-body>{{body}}</set-body>"
        }
    },
    {
        "id": "cors",
        "name": "CORS",
        "category": "security",
        "intent": "I want to enable Cross-Origin Resource Sharing",
        "description": "Allows browser-based clients to access the API.",
        "section": "inbound",
        "displayOrder": 0,
        "templateSchema": {
            "inputs": [
                {
                    "name": "origins",
                    "label": "Allowed Origins (CSV)",
                    "type": "text",
                    "placeholder": "*",
                    "default": "*"
                },
                {
                    "name": "methods",
                    "label": "Allowed Methods (CSV)",
                    "type": "text",
                    "placeholder": "GET, POST",
                    "default": "GET, POST"
                },
                {
                    "name": "allowheaders",
                    "label": "Allowed Headers (CSV)",
                    "type": "text",
                    "placeholder": "Content-Type, Authorization"
                },
                {
                    "name": "exposeheaders",
                    "label": "Expose Headers (CSV)",
                    "type": "text",
                    "placeholder": "*"
                },
                {
                    "name": "maxage",
                    "label": "Max Age (Sec)",
                    "type": "number",
                    "default": "300"
                },
                {
                    "name": "allowcredentials",
                    "label": "Allow Credentials",
                    "type": "boolean",
                    "default": "true"
                }
            ],
            "xmlTemplate": "<cors allow-credentials=\"{{allowcredentials}}\">\n  <allowed-origins>\n    {{origins_block}}\n  </allowed-origins>\n  <allowed-methods>\n    {{methods_block}}\n  </allowed-methods>\n  <allowed-headers>\n    {{headers_block}}\n  </allowed-headers>\n  <expose-headers>\n    {{expose_headers_block}}\n  </expose-headers>\n</cors>"
        }
    },
    {
        "id": "validate-jwt",
        "name": "Validate JWT",
        "category": "security",
        "intent": "I want to validate OAuth2/OIDC tokens",
        "description": "Enforces existence and validity of a JWT in the Authorization header.",
        "section": "inbound",
        "displayOrder": 4,
        "templateSchema": {
            "inputs": [
                {
                    "name": "header",
                    "label": "Header Name",
                    "type": "text",
                    "default": "Authorization"
                },
                {
                    "name": "audiences",
                    "label": "Audiences (CSV)",
                    "type": "text",
                    "placeholder": "api://a, api://b"
                },
                {
                    "name": "azp",
                    "label": "Authorized Parties (azp) (CSV)",
                    "type": "text",
                    "placeholder": "client-id-1, client-id-2",
                    "required": false
                },
                {
                    "name": "roles",
                    "label": "Required Roles (CSV)",
                    "type": "text",
                    "placeholder": "admin, writer",
                    "required": false
                },
                {
                    "name": "issuer",
                    "label": "Issuer (OpenID Config URL)",
                    "type": "text",
                    "placeholder": "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration"
                }
            ],
            "xmlTemplate": "<validate-jwt header-name=\"{{header}}\" failed-validation-httpcode=\"401\" failed-validation-error-message=\"Unauthorized\">\n  <openid-config url=\"{{issuer}}\" />\n  <required-claims>\n    {{claims_block}}\n  </required-claims>\n</validate-jwt>"
        }
    },
    {
        "id": "custom-xml",
        "name": "Custom Logic",
        "category": "transformation",
        "intent": "I want to write custom policy XML",
        "description": "Raw XML block for advanced logic (choose, set-variable, etc).",
        "section": "inbound",
        "displayOrder": 99,
        "templateSchema": {
            "inputs": [
                {
                    "name": "xml",
                    "label": "XML Content",
                    "type": "textarea",
                    "placeholder": "<my-policy />"
                }
            ],
            "xmlTemplate": "{{xml}}"
        }
    }
];

async function seed() {
    try {
        console.log('🌱 Seeding Policy Templates...');

        await pool.query('BEGIN');

        for (const t of TEMPLATES) {
            const query = `
                INSERT INTO policy_templates(id, name, description, category, section, template_schema, display_order)
VALUES($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT(id) DO UPDATE SET
name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    section = EXCLUDED.section,
    template_schema = EXCLUDED.template_schema,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();
`;

            // Add 'tagName' to schema if it exists at root
            const schema: any = { ...t.templateSchema };
            if ((t as any).tagName) {
                schema.tagName = (t as any).tagName;
            }

            await pool.query(query, [
                t.id,
                t.name,
                t.description,
                t.category,
                t.section,
                JSON.stringify(schema),
                t.displayOrder
            ]);
            console.log(`Updated template: ${t.id} `);
        }

        await pool.query('COMMIT');
        console.log('✅ Seeding complete.');
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
