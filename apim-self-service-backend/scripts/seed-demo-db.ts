import { Client } from 'pg';

const dbConfig = {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/apim_portal',
};

async function seedDemoData() {
    const client = new Client(dbConfig);

    try {
        await client.connect();
        console.log('🔌 Connected to DB. Seeding "Day 1 Demo" Data...');

        // 0. Self-Healing Schema Migration (in case DB is old)
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS detected_anomalies JSONB;`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS last_deployed_commit_hash TEXT;`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS terraform_pipeline_url TEXT;`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS dev_hash TEXT;`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS qa_hash TEXT;`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS stage_hash TEXT;`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS prod_hash TEXT;`);

        // Approval Request Schema Patch
        await client.query(`ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS approver_team_id TEXT;`);
        await client.query(`ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requester_name TEXT;`);
        await client.query(`ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS requester_email TEXT;`);

        console.log('🛠️ Schema Patched.');

        // 1. Seed Teams
        await client.query(`
            INSERT INTO teams (id, name, type, description, member_count)
            VALUES 
                ('team-platform', 'Platform Engineering', 'producer', 'Core platform services.', 12),
                ('team-payments', 'Payments Squad', 'both', 'Payment processing and ledger.', 8),
                ('team-analytics', 'Data Analytics', 'consumer', 'Business intelligence consumption.', 5)
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Teams Seeded.');

        // 2. Clear Products & Dependencies (Start fresh for demo)
        // Order matters due to Foreign Key constraints
        await client.query('DELETE FROM approval_requests;');
        await client.query('DELETE FROM subscriptions;');
        await client.query('DELETE FROM operations;');
        await client.query('DELETE FROM apis;');
        await client.query('DELETE FROM app_registrations;'); // FK blocker
        await client.query('DELETE FROM products;');

        // 3. Insert "Legacy Order API" (The Wild West) 🤠
        // - Manual Creation (Red Banner)
        // - Unowned
        // - Complex XML (for Parser Demo)
        const legacyXml = `
<policies>
    <inbound>
        <base />
        <rate-limit calls="50" renewal-period="60" />
        <validate-jwt header-name="Authorization" failed-validation-error-message="Access token is missing or invalid.">
            <openid-config url="https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration" />
            <required-claims>
                <claim name="aud">
                    <value>api://my-api</value>
                </claim>
            </required-claims>
        </validate-jwt>
        <set-header name="X-Legacy-Header" exists-action="override">
            <value>LegacyValue</value>
        </set-header>
        <choose>
            <when condition="@(context.Request.Headers.GetValueOrDefault("Environment") == "Beta")">
                <set-backend-service base-url="https://beta-api.contoso.com" />
            </when>
        </choose>
    </inbound>
    <backend><base /></backend>
    <outbound><base /></outbound>
    <on-error><base /></on-error>
</policies>`.replace(/'/g, "''"); // Escape single quotes for SQL

        // Sanitize for JSON string (escape newlines and double quotes)
        const jsonSafeXml = legacyXml
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/"/g, '\\"');

        await client.query(`
            INSERT INTO products (
                id, name, display_name, version, state, environment,
                owner_team_id, management_mode, authorized_teams,
                detected_anomalies, quality_score, apim_raw_data
            ) VALUES (
                'prod-legacy',
                'legacy-order-api',
                'Legacy Order Processing API',
                'v1.0 (XML)',
                'published',
                'PROD',
                'team-payments',
                'TERRAFORM_MANAGED', -- Forced Lock
                '{"PROD": ["team-payments"]}',
                '["MANUAL_CREATION", "UNOWNED"]'::jsonb, -- The RED FLAGS
                45.00,
                '{"policyXml": "${jsonSafeXml}"}'::jsonb
            );
        `);

        // Insert API for Legacy Product (so we can click "Visual Policy")
        await client.query(`
            INSERT INTO apis (id, product_id, name, display_name, path, quality_score)
            VALUES (
                'api-legacy-01',
                'prod-legacy',
                'order-processing',
                'Order Processing Endpoint',
                '/orders/v1',
                40.00
            );
        `);
        console.log('✅ Legacy Product Seeded.');


        // 4. Insert "Payment Gateway v2" (The Golden Path) ✨
        // - Terraform Managed (Blue Banner)
        // - Git Hash populated for Multi-Env Demo
        // - Divergence to show "Changed in DEV"
        await client.query(`
            INSERT INTO products (
                id, name, display_name, version, state, environment,
                owner_team_id, management_mode, authorized_teams,
                detected_anomalies, quality_score, 
                last_deployed_commit_hash, terraform_pipeline_url,
                dev_hash, qa_hash, prod_hash
            ) VALUES (
                'prod-payment-v2',
                'payment-gateway-v2',
                'Payment Gateway v2',
                'v2.3.0',
                'published',
                'DEV',
                'team-payments',
                'TERRAFORM_MANAGED',
                '{"DEV": ["team-payments"]}',
                '[]'::jsonb, -- Clean!
                98.50,
                'a1b2c3d', -- Git Hash (Base)
                'https://dev.azure.com/contoso/project/_build?definitionId=123',
                'new-feature-hash-xyz', -- DEV hash differs (Simulates "Changed in DEV")
                'a1b2c3d', -- QA matched Base
                'a1b2c3d'  -- PROD matches Base
            );
        `);

        // Insert API for Modern Product
        await client.query(`
            INSERT INTO apis (id, product_id, name, display_name, path, quality_score)
            VALUES (
                'api-payment-v2',
                'prod-payment-v2',
                'payment-api',
                'Payment API',
                '/payments/v2',
                99.00
            );
        `);
        console.log('✅ Modern Product Seeded.');

        // 5. Insert Approval Request for "Validation Gate" Demo 🛡️
        // - Type: PRODUCT_ONBOARDING
        // - Missing Repo URL (to be filled in UI)
        await client.query(`
            INSERT INTO approval_requests (
                id, type, status, requester_team_id, submitted_at, details, 
                approver_team_id, requester_name, requester_email
            ) VALUES (
                'req-onboarding-01',
                'PRODUCT_ONBOARDING',
                'PENDING',
                'team-analytics',
                NOW(),
                '{"targetName": "Data Analytics Hub", "targetVersion": "v1.0-alpha", "environment": "DEV", "reason": "New platform for BI dashboards."}'::jsonb,
                'team-platform',
                'Alice Data',
                'alice@contoso.com'
            );
        `);
        console.log('✅ Approval Request Seeded (Validation Gate).');

    } catch (err) {
        console.error('❌ Seeding Failed:', err);
    } finally {
        await client.end();
    }
}

seedDemoData();
