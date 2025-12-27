/**
 * @fileoverview Seed Data Script for Development
 * 
 * Populates database with realistic test data for local development
 * Run: npm run seed-data
 */

import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Load config
function loadConfig() {
    const configPaths = [
        join(process.cwd(), 'apim-database', 'config.json'),
        join(process.cwd(), 'config.json')
    ];
    for (const path of configPaths) {
        if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
    }
    return {};
}

const config = loadConfig();
const DATABASE_URL = config.azure?.environments[0]?.databaseUrl || config.database?.url;

async function main() {
    console.log('🌱 Seeding database with test data...\n');

    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        // 1. Teams
        console.log('📦 Creating teams...');
        await pool.query(`
            INSERT INTO teams (id, display_name, azure_ad_group_id, type, description, contact_email) VALUES
            ('team-payments', 'Payments & Billing', 'ad-group-payments', 'producer', 'Handles all payment processing APIs', 'payments@company.com'),
            ('team-core', 'Core Systems', 'ad-group-core', 'producer', 'Core platform services', 'core@company.com'),
            ('team-mobile', 'Mobile Team', 'ad-group-mobile', 'consumer', 'Mobile app development', 'mobile@company.com'),
            ('team-web', 'Web Team', 'ad-group-web', 'consumer', 'Web app development', 'web@company.com')
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Created 4 teams');

        // 2. Users
        console.log('👥 Creating users...');
        await pool.query(`
            INSERT INTO users (id, email, name, azure_ad_object_id, default_team_id, role) VALUES
            ('user-admin', 'admin@company.com', 'Admin User', 'ad-obj-admin', 'team-core', 'admin'),
            ('user-alice', 'alice@company.com', 'Alice Producer', 'ad-obj-alice', 'team-payments', 'user'),
            ('user-bob', 'bob@company.com', 'Bob Consumer', 'ad-obj-bob', 'team-mobile', 'user')
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Created 3 users');

        // 3. Products
        console.log('🎯 Creating products...');
        await pool.query(`
            INSERT INTO products (
                id, name, display_name, version, description, state,
                owner_team_id, environment, visibility, management_mode,
                terraform_pipeline_url, github_url,
                git_repo_url, git_file_path,
                quality_score,
                dev_hash, qa_hash, stage_hash, production_hash
            ) VALUES
            (
                'prod-payment-gateway-dev',
                'payment-gateway',
                'Payment Gateway API',
                'v2.1.0',
                'Core payment processing and transaction management',
                'published',
                'team-payments',
                'DEV',
                'internal',
                'TERRAFORM_MANAGED',
                'https://dev.azure.com/company/payments/_build',
                'https://github.com/company/payment-gateway',
                'https://github.com/company/payment-gateway.git',
                'openapi/payment-gateway.yaml',
                98.5,
                'abc123dev', NULL, NULL, NULL
            ),
            (
                'prod-payment-gateway-qa',
                'payment-gateway',
                'Payment Gateway API',
                'v2.1.0',
                'Core payment processing and transaction management',
                'published',
                'team-payments',
                'QA',
                'internal',
                'TERRAFORM_MANAGED',
                'https://dev.azure.com/company/payments/_build',
                'https://github.com/company/payment-gateway',
                'https://github.com/company/payment-gateway.git',
                'openapi/payment-gateway.yaml',
                98.5,
                'abc123dev', 'def456qa', NULL, NULL
            ),
            (
                'prod-payment-gateway-prod',
                'payment-gateway',
                'Payment Gateway API',
                'v2.0.5',
                'Core payment processing and transaction management',
                'published',
                'team-payments',
                'PROD',
                'internal',
                'TERRAFORM_MANAGED',
                'https://dev.azure.com/company/payments/_build',
                'https://github.com/company/payment-gateway',
                'https://github.com/company/payment-gateway-prod.git',
                'openapi/payment-gateway.yaml',
                100.0,
                NULL, NULL, NULL, 'xyz789prod'
            ),
            (
                'prod-user-service-dev',
                'user-service',
                'User Management Service',
                'v1.0.0',
               'User authentication and profile management',
                'published',
                'team-core',
                'DEV',
                'private',
                'TERRAFORM_MANAGED',
                'https://dev.azure.com/company/core/_build',
                'https://github.com/company/user-service',
                'https://github.com/company/user-service.git',
                'openapi/user-service.yaml',
                95.0,
                'user123dev', NULL, NULL, NULL
            )
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Created 4 products (3 payment gateway across envs, 1 user service)');

        // 4. APIs
        console.log('🔌 Creating APIs...');
        await pool.query(`
            INSERT INTO apis (id, product_id, name, display_name, description, path, quality_score) VALUES
            ('api-payment-process-dev', 'prod-payment-gateway-dev', 'payment-process', 'Payment Processing', 'Process payments and refunds', '/api/v2/payments', 97.0),
            ('api-payment-process-qa', 'prod-payment-gateway-qa', 'payment-process', 'Payment Processing', 'Process payments and refunds', '/api/v2/payments', 97.0),
            ('api-payment-process-prod', 'prod-payment-gateway-prod', 'payment-process', 'Payment Processing', 'Process payments and refunds', '/api/v2/payments', 100.0),
            ('api-user-auth-dev', 'prod-user-service-dev', 'user-auth', 'User Authentication', 'OAuth2 and JWT authentication', '/api/v1/auth', 95.0)
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Created 4 APIs');

        // 5. Operations
        console.log('⚙️  Creating operations...');
        await pool.query(`
            INSERT INTO operations (id, api_id, name, display_name, method, url_template, description) VALUES
            ('op-create-payment', 'api-payment-process-dev', 'createPayment', 'Create Payment', 'POST', '/api/v2/payments', 'Create a new payment transaction'),
            ('op-get-payment', 'api-payment-process-dev', 'getPayment', 'Get Payment Status', 'GET', '/api/v2/payments/{paymentId}', 'Retrieve payment status'),
            ('op-login', 'api-user-auth-dev', 'login', 'User Login', 'POST', '/api/v1/auth/login', 'Authenticate user and return JWT')
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Created 3 operations');

        // 6. Subscriptions
        console.log('🔐 Creating subscriptions...');
        await pool.query(`
            INSERT INTO subscriptions (
                id, product_id, subscriber_team_id, state,
                primary_key_name, primary_key_value,
                created_at
            ) VALUES
            (
                'sub-mobile-payment-dev',
                'prod-payment-gateway-dev',
                'team-mobile',
                'active',
                'mobile-payment-key',
                'encrypted-primary-key-mobile-dev',
                NOW() - INTERVAL '30 days'
            ),
            (
                'sub-web-payment-dev',
                'prod-payment-gateway-dev',
                'team-web',
                'active',
                'web-payment-key',
                'encrypted-primary-key-web-dev',
                NOW() - INTERVAL '15 days'
            ),
            (
                'sub-mobile-payment-qa',
                'prod-payment-gateway-qa',
                'team-mobile',
                'pending',
                NULL,
                NULL,
                NOW()
            )
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Created 3 subscriptions (2 active, 1 pending)');

        // 7. Approval Requests
        console.log('✔️  Creating approval requests...');
        await pool.query(`
            INSERT INTO approval_requests (
                id, type, status,
                requester_name, requester_email, requester_team_id,
                details, submitted_at
            ) VALUES
            (
                'approval-sub-mobile-qa',
                'SUBSCRIPTION',
                'PENDING',
                'Bob Consumer',
                'bob@company.com',
                'team-mobile',
                '{"productId": "prod-payment-gateway-qa", "teamId": "team-mobile", "justification": "Need for QA mobile testing"}',
                NOW()
            )
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Created 1 approval request');

        // 8. App Registrations
        console.log('🔑 Creating app registrations...');
        await pool.query(`
            INSERT INTO app_registrations (id, client_id, display_name, environment, product_id, owner_team_id) VALUES
            ('app-mobile-dev', 'client-mobile-dev-123', 'Mobile App (DEV)', 'DEV', 'prod-payment-gateway-dev', 'team-mobile'),
            ('app-web-dev', 'client-web-dev-456', 'Web App (DEV)', 'DEV', 'prod-payment-gateway-dev', 'team-web')
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Created 2 app registrations');

        // 9. Named Values (Access Control Lists)
        console.log('🗝️  Creating named values...');
        await pool.query(`
            INSERT INTO access_control_lists (key, environment, value) VALUES
            ('backend-payment-url', 'DEV', 'https://dev-payment-backend.company.com'),
            ('backend-payment-url', 'QA', 'https://qa-payment-backend.company.com'),
            ('backend-payment-url', 'PROD', 'https://payment-backend.company.com'),
            ('api-timeout-seconds', 'DEV', '30'),
            ('api-timeout-seconds', 'PROD', '10')
            ON CONFLICT (key, environment) DO NOTHING
        `);
        console.log('   ✅ Created 5 named values');

        // 10. Backends
        console.log('🔧 Creating backends...');
        await pool.query(`
            INSERT INTO governance_backends (id, environment, url, description, title, protocol) VALUES
            ('payment-processor-backend', 'DEV', 'https://dev-payment-backend.company.com', 'Payment processor service', 'Payment Backend', 'https'),
            ('payment-processor-backend', 'QA', 'https://qa-payment-backend.company.com', 'Payment processor service', 'Payment Backend', 'https'),
            ('payment-processor-backend', 'PROD', 'https://payment-backend.company.com', 'Payment processor service', 'Payment Backend', 'https'),
            ('user-db-backend', 'DEV', 'https://dev-userdb.company.com', 'User database backend', 'User DB', 'https')
            ON CONFLICT (id, environment) DO NOTHING
        `);
        console.log('   ✅ Created 4 backends');

        // 11. API Backends (linkage)
        console.log('🔗 Linking APIs to backends...');
        await pool.query(`
            INSERT INTO api_backends (api_id, backend_id, environment) VALUES
            ('api-payment-process-dev', 'payment-processor-backend', 'DEV'),
            ('api-payment-process-qa', 'payment-processor-backend', 'QA'),
            ('api-payment-process-prod', 'payment-processor-backend', 'PROD'),
            ('api-user-auth-dev', 'user-db-backend', 'DEV')
            ON CONFLICT (api_id, backend_id, environment) DO NOTHING
        `);
        console.log('   ✅ Linked APIs to backends');

        // Verify counts
        console.log('\n📊 Verification:');
        const counts = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM teams) as teams,
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM products) as products,
                (SELECT COUNT(*) FROM apis) as apis,
                (SELECT COUNT(*) FROM operations) as operations,
                (SELECT COUNT(*) FROM subscriptions) as subscriptions,
                (SELECT COUNT(*) FROM approval_requests) as approvals,
                (SELECT COUNT(*) FROM app_registrations) as app_regs
        `);
        const row = counts.rows[0];
        console.log(`   Teams: ${row.teams}`);
        console.log(`   Users: ${row.users}`);
        console.log(`   Products: ${row.products}`);
        console.log(`   APIs: ${row.apis}`);
        console.log(`   Operations: ${row.operations}`);
        console.log(`   Subscriptions: ${row.subscriptions}`);
        console.log(`   Approvals: ${row.approvals}`);
        console.log(`   App Registrations: ${row.app_regs}`);

        console.log('\n✅ Seed data created successfully!');
        console.log('\n📝 Test Scenario:');
        console.log('   • Payment Gateway API exists in DEV, QA, PROD with different versions');
        console.log('   • DEV has 2 active subscriptions (Mobile, Web)');
        console.log('   • QA has 1 pending subscription (Mobile) with approval request');
        console.log('   • Subscriber count will show: DEV=2, QA=0, PROD=0');
        console.log('   • You can test promotion workflow DEV→QA→PROD');

    } catch (err) {
        console.error('\n❌ Seed data creation failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main().catch(err => console.error('\n💥 Fatal Error:', err));
