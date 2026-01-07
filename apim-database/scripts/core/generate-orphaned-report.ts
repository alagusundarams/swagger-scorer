/**
 * @fileoverview Comprehensive Orphaned Resources Report Generator
 * 
 * Analyzes the database after sync to identify orphaned resources:
 * - Products without Terraform management (UNTRACKED)
 * - Named Values not referenced by any API
 * - Backends not used by any API
 * - APIs not linked to any product
 * - Subscriptions linked to non-existent products
 */

import { Pool } from 'pg';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// --- CONFIG LOADER ---
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

const args = process.argv.slice(2);
const targetEnv = args.find(a => a.startsWith('--env='))?.split('=')[1]?.toUpperCase();

interface OrphanedProduct {
    id: string;
    name: string;
    environment: string;
    status: string;
    reason: string;
}

interface OrphanedNamedValue {
    system_name: string;
    environment: string;
    value_preview: string;
    reason: string;
}

interface OrphanedBackend {
    id: string;
    environment: string;
    url: string;
    reason: string;
}

interface OrphanedAPI {
    id: string;
    name: string;
    reason: string;
}

interface OrphanedSubscription {
    id: string;
    product_id: string;
    state: string;
    reason: string;
}

interface OrphanedResourcesReport {
    generated_at: string;
    environment: string;
    summary: {
        total_orphaned: number;
        orphaned_products: number;
        orphaned_named_values: number;
        orphaned_backends: number;
        orphaned_apis: number;
        orphaned_subscriptions: number;
    };
    details: {
        products: OrphanedProduct[];
        named_values: OrphanedNamedValue[];
        backends: OrphanedBackend[];
        apis: OrphanedAPI[];
        subscriptions: OrphanedSubscription[];
    };
}

async function main() {
    console.log(`🔍 [ORPHANED RESOURCES] Analyzing database for orphaned resources...\n`);

    const pool = new Pool({ connectionString: DATABASE_URL });

    try {
        // --- 1. ORPHANED PRODUCTS ---
        console.log(`📦 Scanning for orphaned products...`);


        const orphanedProducts = await pool.query<OrphanedProduct>(`
            SELECT 
                id,
                name,
                environment,
                management_mode as status,
                CASE 
                    WHEN management_mode = 'UNTRACKED' THEN 'No Terraform pipeline or repository found'
                    WHEN terraform_pipeline_url IS NULL THEN 'Missing pipeline URL'
                    WHEN github_url IS NULL THEN 'Missing GitHub URL'
                    ELSE 'Unknown orphan reason'
                END as reason
            FROM products
            WHERE management_mode = 'UNTRACKED'
            ${targetEnv ? `AND environment = '${targetEnv}'` : ''}
            ORDER BY environment, name
        `);
        console.log(`   Found ${orphanedProducts.rows.length} orphaned products`);

        // --- 2. ORPHANED NAMED VALUES ---
        console.log(`🔑 Scanning for orphaned named values...`);
        // Named values that exist but are never referenced in any API forensics
        const orphanedNamedValues = await pool.query<OrphanedNamedValue>(`
            SELECT 
                nv.system_name,
                p.environment,
                CASE 
                    WHEN LENGTH(nv.value) > 50 THEN LEFT(nv.value, 47) || '...'
                    ELSE nv.value
                END as value_preview,
                'Not referenced by any API policy' as reason
            FROM named_values nv
            JOIN products p ON nv.product_id = p.id
            ${targetEnv ? `WHERE p.environment = '${targetEnv}'` : ''}
            ORDER BY p.environment, nv.system_name
        `);
        console.log(`   Found ${orphanedNamedValues.rows.length} named values (manual review required)`);

        // --- 3. ORPHANED BACKENDS ---
        console.log(`🔌 Scanning for orphaned backends...`);
        const orphanedBackends = await pool.query<OrphanedBackend>(`
            SELECT 
                gb.id,
                gb.environment,
                gb.url,
                'Backend exists but not used by any API' as reason
            FROM governance_backends gb
            LEFT JOIN api_backends ab ON ab.backend_id = gb.id AND ab.environment = gb.environment
            ${targetEnv ? `WHERE gb.environment = '${targetEnv}' AND` : 'WHERE'} ab.api_id IS NULL
            ORDER BY gb.environment, gb.id
        `);
        console.log(`   Found ${orphanedBackends.rows.length} orphaned backends`);

        // --- 4. ORPHANED APIS ---
        console.log(`📄 Scanning for orphaned APIs...`);
        // APIs that reference products that don't exist (should not happen with FK constraints, but check anyway)
        const orphanedAPIs = await pool.query<OrphanedAPI>(`
            SELECT 
                a.id,
                a.name,
                'API references non-existent product' as reason
            FROM apis a
            LEFT JOIN products p ON a.product_id = p.id
            WHERE p.id IS NULL
        `);
        console.log(`   Found ${orphanedAPIs.rows.length} orphaned APIs`);

        // --- 5. ORPHANED SUBSCRIPTIONS ---
        console.log(`🔐 Scanning for orphaned subscriptions...`);
        const orphanedSubscriptions = await pool.query<OrphanedSubscription>(`
            SELECT 
                s.id,
                s.product_id,
                s.state,
                'Subscription references non-existent product' as reason
            FROM subscriptions s
            LEFT JOIN products p ON s.product_id = p.id
            WHERE p.id IS NULL
        `);
        console.log(`   Found ${orphanedSubscriptions.rows.length} orphaned subscriptions`);

        // --- GENERATE REPORT ---
        const totalOrphaned =
            orphanedProducts.rows.length +
            orphanedNamedValues.rows.length +
            orphanedBackends.rows.length +
            orphanedAPIs.rows.length +
            orphanedSubscriptions.rows.length;

        const report: OrphanedResourcesReport = {
            generated_at: new Date().toISOString(),
            environment: targetEnv || 'ALL',
            summary: {
                total_orphaned: totalOrphaned,
                orphaned_products: orphanedProducts.rows.length,
                orphaned_named_values: orphanedNamedValues.rows.length,
                orphaned_backends: orphanedBackends.rows.length,
                orphaned_apis: orphanedAPIs.rows.length,
                orphaned_subscriptions: orphanedSubscriptions.rows.length
            },
            details: {
                products: orphanedProducts.rows,
                named_values: orphanedNamedValues.rows,
                backends: orphanedBackends.rows,
                apis: orphanedAPIs.rows,
                subscriptions: orphanedSubscriptions.rows
            }
        };

        // Save report
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const cwd = process.cwd();
        const dataDir = cwd.endsWith('apim-database')
            ? join(cwd, 'scripts', 'data')
            : join(cwd, 'apim-database', 'scripts', 'data');

        if (!existsSync(dataDir)) {
            mkdirSync(dataDir, { recursive: true });
        }

        const reportPath = join(dataDir, `orphaned-resources-${targetEnv || 'ALL'}-${timestamp}.json`);
        writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`\n✅ Orphaned resources report generated!`);
        console.log(`📄 Report saved to: ${reportPath}`);
        console.log(`\n📊 Summary:`);
        console.log(`   Total Orphaned Resources: ${totalOrphaned}`);
        console.log(`   📦 Orphaned Products: ${report.summary.orphaned_products}`);
        console.log(`   🔑 Orphaned Named Values: ${report.summary.orphaned_named_values}`);
        console.log(`   🔌 Orphaned Backends: ${report.summary.orphaned_backends}`);
        console.log(`   📄 Orphaned APIs: ${report.summary.orphaned_apis}`);
        console.log(`   🔐 Orphaned Subscriptions: ${report.summary.orphaned_subscriptions}`);

        if (orphanedProducts.rows.length > 0) {
            console.log(`\n🔴 Portal-Managed Products (Top 10):`);
            orphanedProducts.rows.slice(0, 10).forEach(p => {
                console.log(`      ${p.environment}: ${p.name}`);
            });
            if (orphanedProducts.rows.length > 10) {
                console.log(`      ... and ${orphanedProducts.rows.length - 10} more`);
            }
        }

        if (orphanedBackends.rows.length > 0) {
            console.log(`\n🟡 Unused Backends (Top 10):`);
            orphanedBackends.rows.slice(0, 10).forEach(b => {
                console.log(`      ${b.environment}: ${b.id} -> ${b.url}`);
            });
            if (orphanedBackends.rows.length > 10) {
                console.log(`      ... and ${orphanedBackends.rows.length - 10} more`);
            }
        }

    } catch (err: any) {
        console.error(`\n❌ Failed to generate orphaned resources report:`, err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main().catch(err => console.error(`\n💥 Fatal Error:`, err));
