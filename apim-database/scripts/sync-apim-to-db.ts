/**
 * @fileoverview MASTER SYNC SCRIPT: Azure APIM -> Self-Service Portal DB
 * 
 * EXECUTION CONTEXT:
 * Run this on the Windows Machine with Azure CLI authenticated (`az login`).
 * 
 * PURPOSE:
 * 1. Pulls "Real-Time" state from Azure APIM (The Truth on the ground).
 * 2. Merges with "Governance" state from Postgres (Approvals, Team Ownership).
 * 3. Pulls "Contract" metadata from Git (if linked).
 * 
 * DATA SOURCE LEGEND:
 * [APIM]   = Derived directly from Azure ARM REST API.
 * [DB]     = Mastered in our Postgres DB (cannot be overwritten by APIM).
 * [GIT]    = Fetched from the linked Repository.
 * [HYBRID] = Calculated/Merged at runtime.
 */

import { Pool } from 'pg';
import axios from 'axios';
import { execSync } from 'child_process';

// --- CONFIGURATION ---
const DB_CONFIG = {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/apim'
};

const AZURE_CONFIG = {
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID,
    resourceGroup: process.env.AZURE_RG,
    serviceName: process.env.APIM_SERVICE_NAME
};

// --- DATA TYPES ---
interface ApimProduct {
    id: string;             // [APIM] /products/{id}
    name: string;           // [APIM] properties.displayName
    description: string;    // [APIM] properties.description
    state: string;          // [APIM] properties.state
    subscriptionCount: number; // [APIM] Computed from /subscriptions list
}

interface ApimApi {
    id: string;             // [APIM] /apis/{id}
    name: string;           // [APIM] properties.displayName
    path: string;           // [APIM] properties.path
    protocols: string[];    // [APIM] properties.protocols
    serviceUrl: string;     // [APIM] properties.serviceUrl
    policyXml: string;      // [APIM] /policies/policy
}

// --- MAIN EXECUTION ---
async function main() {
    console.log('🚀 Starting Master Sync...');
    const pool = new Pool(DB_CONFIG);

    try {
        // 1. Authenticate (Assume az login is done)
        const token = getAzureToken();
        console.log('✅ Azure Auth Token Acquired');

        // 2. Fetch Global Inventory [SOURCE: APIM]
        const apimProducts = await fetchApimProducts(token);
        const apimApis = await fetchApimApis(token);

        console.log(`📊 Found ${apimProducts.length} Products and ${apimApis.length} APIs in Azure.`);

        // 3. FETCH SUBSCRIPTIONS (Sensitivity Alert: KEYS)
        let apimSubs: any[] = [];
        try {
            apimSubs = await fetchApimSubscriptions(token);
            console.log(`🔑 Found ${apimSubs.length} Subscriptions.`);
        } catch (e) {
            console.warn('⚠️ [PROD WARNING] Could not fetch Subscriptions (Access Denied). Skipping keys.');
        }

        // 4. FETCH NAMED VALUES (For Environment Config)
        let namedValues: any[] = [];
        try {
            namedValues = await fetchNamedValues(token);
            console.log(`🌍 Found ${namedValues.length} Named Values.`);
        } catch (e) {
            console.warn('⚠️ [PROD WARNING] Could not fetch Named Values (Access Denied). Skipping config.');
        }

        // --- WRITING TO DB ---

        // A. SYNC PRODUCTS
        for (const p of apimProducts) {
            console.log(`Processing Product: ${p.name}...`);

            // [HYBRID] Logic: We must NOT overwrite the 'owner_team_id' if it already exists in DB.
            // But if it's new, we default to 'orphaned' (or a specific triage team).
            // ADDED: Logic to map "Team" via "Owner" if a map exists
            const inferredTeamId = OWNER_MAP[p.id] || 'orphaned';

            // ADDED: Git Hash Lookup (Stubbed)
            const gitInfo = await fetchGitInfo(p.id);

            // ADDED: Anomaly Detection Logic (The "Sentinel")
            const anomalies: string[] = [];
            if (!gitInfo.hash) anomalies.push('MANUAL_CREATION');
            if (inferredTeamId === 'orphaned') anomalies.push('UNOWNED');

            // [WILD WEST LOGIC]: If it's a "Manual Creation" (No Git), we must LOCK it to prevent risky portal edits.
            // We set it to 'TERRAFORM_MANAGED' (which functionally means "Read Only / External Source").
            // The UI will distinguish between "Real Terraform" and "Wild West" via the anomaly flag.
            const derivedManagementMode = anomalies.includes('MANUAL_CREATION') ? 'TERRAFORM_MANAGED' : 'HYBRID';

            await pool.query(`
                INSERT INTO products (id, display_name, description, state, subscriber_count, owner_team_id, 
                    last_deployed_commit_hash, last_deployed_at, detected_anomalies, management_mode, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    state = EXCLUDED.state,
                    subscriber_count = EXCLUDED.subscriber_count,
                    last_deployed_commit_hash = EXCLUDED.last_deployed_commit_hash,
                    detected_anomalies = EXCLUDED.detected_anomalies,
                    management_mode = EXCLUDED.management_mode; -- Update mode based on latest findings
            `, [p.id, p.name, p.description, p.state, p.subscriptionCount, inferredTeamId, gitInfo.hash, gitInfo.date, JSON.stringify(anomalies), derivedManagementMode]);
        }

        // B. SYNC APIs
        for (const a of apimApis) {
            console.log(`Processing API: ${a.name} (${a.path})...`);

            // [APIM] Policy XML extraction
            // We store this in 'apim_raw_data' for the "Policy Lens" to interpret.
            const rawData = JSON.stringify({
                protocols: a.protocols,
                serviceUrl: a.serviceUrl,
                policyXml: a.policyXml // [APIM] The critical payload for the Visualizer
            });

            await pool.query(`
                INSERT INTO apis (
                    id,
                    name,
                    display_name,
                    path,
                    product_id, -- [APIM] Linked via product-api link (simplified here)
                    apim_raw_data,
                    updated_at
                )
                VALUES ($1, $1, $2, $3, 'unknown-product', $4, NOW()) -- 'unknown-product' placeholder until link logic runs
                ON CONFLICT (id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    path = EXCLUDED.path,
                    apim_raw_data = EXCLUDED.apim_raw_data;
            `, [a.id, a.name, a.path, rawData]);
        }

        // C. SYNC SUBSCRIPTIONS (New)
        for (const s of apimSubs) {
            // [APIM] We define the "Owner Team" by looking up the "Owner ID" (User)
            // This requires a User->Team map in DB.
            console.log(`Processing Subscription: ${s.name}...`);
            await pool.query(`
                INSERT INTO subscriptions (
                    id, product_id, subscriber_team_id, state,
                    primary_key_name, primary_key_value, -- ENCRYPT THIS IN PROD
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, 'primary', $5, $6, NOW())
                ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state;
            `, [s.id, s.productId, s.userId, s.state, s.primaryKey, s.createdDate]);
        }

        // D. SYNC ENVIRONMENT CONFIG (Named Values)
        for (const nv of namedValues) {
            // We assume the APIM value is the "PROD" value for now.
            await pool.query(`
                INSERT INTO access_control_lists (key, environment, value)
                VALUES ($1, 'PROD', $2)
                ON CONFLICT (key, environment) DO UPDATE SET value = EXCLUDED.value;
            `, [nv.name, nv.value]);
        }

        console.log('✅ Sync Complete.');

    } catch (err) {
        console.error('❌ Sync Failed:', err);
    } finally {
        await pool.end();
    }
}

// --- HELPER FUNCTIONS (STUBBED) ---
// --- STUB DEFINITIONS ---
const OWNER_MAP: Record<string, string> = {
    'echo-api': 'team-core-services' // Example Mapping
};

function getAzureToken(): string {
    // In reality: execSync('az account get-access-token ...')
    return 'mock-token';
}

async function fetchApimProducts(token: string): Promise<ApimProduct[]> {
    // [APIM] Calls GET /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ApiManagement/service/{service}/products
    return [
        { id: 'echo-api', name: 'Echo API', description: 'Test API', state: 'published', subscriptionCount: 5 }
    ];
}

async function fetchApimSubscriptions(token: string): Promise<any[]> {
    // Requires: Microsoft.ApiManagement/service/subscriptions/listSecrets/action
    return [{
        id: 'sub-1', name: 'My Sub', productId: 'echo-api', userId: 'user-1', state: 'active',
        primaryKey: 'xxx-encrypted-xxx', createdDate: new Date().toISOString()
    }];
}

async function fetchNamedValues(token: string): Promise<any[]> {
    // Requires: Microsoft.ApiManagement/service/namedValues/read
    return [{ name: 'backend-url', value: 'https://api.dev.com' }];
}

async function fetchGitInfo(productId: string): Promise<{ hash: string, date: string }> {
    // [GIT] Lookup Azure DevOps Repo for this product
    // Either via ADO REST API or `git ls-remote`
    return { hash: 'a1b2c3d', date: new Date().toISOString() };
}

async function fetchApimApis(token: string): Promise<ApimApi[]> {
    // [APIM] Calls GET /apis
    return [
        {
            id: 'echo-v1',
            name: 'Echo V1',
            path: '/echo',
            protocols: ['https'],
            serviceUrl: 'https://echo.api',
            policyXml: '<policies><inbound><base /></inbound></policies>'
        }
    ];
}

main();
