/**
 * @fileoverview Demo Data Seeding Script
 * 
 * Run: npx tsx apim-database/scripts/utils/seed-demo.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadConfig() {
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json'),
        join(process.cwd(), '..', 'config.json')
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();
const DATABASE_URL = process.env.DATABASE_URL || config.database?.url || 'postgresql://postgres:postgrespassword@127.0.0.1:5432/apim_portal';

async function seedDemoData() {
    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        console.log('🔌 Connected to DB. Seeding "Day 1 Demo" Data...');

        // 1. Seed Teams
        await pool.query(`
            INSERT INTO teams (id, name, type, description, member_count)
            VALUES 
                ('team-platform', 'Platform Engineering', 'producer', 'Core platform services.', 12),
                ('team-payments', 'Payments Squad', 'both', 'Payment processing and ledger.', 8),
                ('team-analytics', 'Data Analytics', 'consumer', 'Business intelligence consumption.', 5)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                description = EXCLUDED.description,
                member_count = EXCLUDED.member_count;
        `);
        console.log('✅ Teams Seeded.');

        // 2. Clear Products & Dependencies (Start fresh for demo)
        await pool.query('DELETE FROM approval_requests;');
        await pool.query('DELETE FROM subscriptions;');
        await pool.query('DELETE FROM operations;');
        await pool.query('DELETE FROM apis;');
        await pool.query('DELETE FROM app_registrations;');
        await pool.query('DELETE FROM named_values;');
        await pool.query('DELETE FROM governance_backends;');
        await pool.query('DELETE FROM products;');

        // 3. Insert "Legacy Order API" (The Wild West)
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
</policies>`.replace(/'/g, "''");

        const jsonSafeXml = legacyXml
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/"/g, '\\"');

        await pool.query(`
            INSERT INTO products (
                id, name, display_name, version, state, environment,
                owner_team_id, management_mode, authorized_teams,
                detected_anomalies, quality_score, apim_raw_data, policy_xml
            ) VALUES (
                'prod-legacy',
                'legacy-order-api',
                'Legacy Order Processing API',
                'v1.0 (XML)',
                'published',
                'PROD',
                'team-payments',
                'TERRAFORM_MANAGED',
                '{"PROD": ["team-payments"]}',
                '["MANUAL_CREATION", "UNOWNED"]'::jsonb,
                45.00,
                '{"policyXml": "${jsonSafeXml}"}'::jsonb,
                '${legacyXml}'
            );
        `);

        await pool.query(`
            INSERT INTO apis (id, product_id, name, display_name, path, quality_score, git_repo_url, git_file_path)
            VALUES (
                'api-legacy-01',
                'prod-legacy',
                'order-processing',
                'Order Processing Endpoint',
                '/orders/v1',
                40.00,
                NULL,
                NULL
            );
        `);
        console.log('✅ Legacy Product Seeded.');


        // 4. Insert "Payment Gateway v2" (The Golden Path)
        await pool.query(`
            INSERT INTO products (
                id, name, display_name, version, state, environment,
                owner_team_id, management_mode, authorized_teams,
                detected_anomalies, quality_score, 
                last_deployed_commit_hash, terraform_pipeline_url,
                dev_hash, qa_hash, production_hash, git_repo_url
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
                '[]'::jsonb,
                98.50,
                'a1b2c3d',
                'https://dev.azure.com/contoso/project/_build?definitionId=123',
                'new-feature-hash-xyz',
                'a1b2c3d',
                'a1b2c3d',
                'https://dev.azure.com/contoso/payment-gateway-v2'
            );
        `);

        await pool.query(`
            INSERT INTO apis (id, product_id, name, display_name, path, quality_score, git_repo_url, git_file_path)
            VALUES (
                'api-payment-v2',
                'prod-payment-v2',
                'payment-api',
                'Payment API',
                '/payments/v2',
                99.00,
                'https://dev.azure.com/contoso/payment-gateway-v2',
                'src/specs/payment-v2.yaml'
            );
        `);
        console.log('✅ Modern Product Seeded.');

        // 5. Insert Approval Request
        await pool.query(`
            INSERT INTO approval_requests (
                id, type, status, requester_team_id, submitted_at, details, 
                requester_name, requester_email
            ) VALUES (
                'req-onboarding-01',
                'PRODUCT_ONBOARDING',
                'PENDING',
                'team-analytics',
                NOW(),
                '{"targetName": "Data Analytics Hub", "targetVersion": "v1.0-alpha", "environment": "DEV", "reason": "New platform for BI dashboards."}'::jsonb,
                'Alice Data',
                'alice@contoso.com'
            );
        `);
        console.log('✅ Approval Request Seeded.');

        // 6. Insert Named Values with environment and region
        await pool.query(`
            INSERT INTO named_values (id, system_name, display_name, value, is_secret, environment, region, product_id)
            VALUES 
                ('nv-01', 'Global_ApiKey', 'Global API Key', 'secret-v1', true, 'PROD', 'Global', 'prod-legacy'),
                ('nv-02', 'Dev_Endpoint', 'Dev Service Endpoint', 'https://dev.backend.com', false, 'DEV', 'Global', 'prod-payment-v2'),
                ('nv-03', 'Orphan_Secret', 'Orphaned Subscription Key', 'orphan-val', true, 'QA', 'Global', NULL)
            ON CONFLICT (id) DO UPDATE SET
                value = EXCLUDED.value,
                environment = EXCLUDED.environment,
                region = EXCLUDED.region;
        `);
        console.log('✅ Named Values Seeded.');

        // 7. Insert Backends with environment and region
        await pool.query(`
            INSERT INTO governance_backends (id, title, url, environment, region, product_id)
            VALUES 
                ('be-01', 'Legacy ERP', 'https://erp.internal.com', 'PROD', 'Global', 'prod-legacy'),
                ('be-02', 'Payment Processor', 'https://api.stripe.com', 'DEV', 'Global', 'prod-payment-v2');
        `);
        console.log('✅ Backends Seeded.');

    } catch (err) {
        console.error('❌ Seeding Failed:', err);
    } finally {
        await pool.end();
    }
}

seedDemoData();
