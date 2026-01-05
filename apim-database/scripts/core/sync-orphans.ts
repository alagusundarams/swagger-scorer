import 'dotenv/config';
import { Pool } from 'pg';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import axios from 'axios';

/**
 * Smart Extraction Engine: APIM Resource Sync (Orphans)
 * 
 * Run: npx tsx apim-database/scripts/core/sync-orphans.ts
 */

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

async function getAccessToken() {
    const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env;
    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
        return 'MOCK_TOKEN';
    }
    try {
        const response = await axios.post(
            `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`,
            new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: AZURE_CLIENT_ID || '',
                client_secret: AZURE_CLIENT_SECRET || '',
                scope: 'https://management.azure.com/.default'
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data.access_token;
    } catch (err) {
        return 'MOCK_TOKEN';
    }
}

async function sync() {
    console.log('🚀 Starting Smart Extraction Engine...');
    const pool = new Pool({ connectionString: DATABASE_URL });
    const environment = process.env.SYNC_ENV || 'DEV';
    const token = await getAccessToken();

    // Minimal ARM helpers if not importing backend service
    const baseUrl = `https://management.azure.com/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${process.env.AZURE_RESOURCE_GROUP}/providers/Microsoft.ApiManagement/service/${process.env.APIM_SERVICE_NAME}`;
    const headers = { Authorization: `Bearer ${token}` };

    try {
        // 1. Sync Named Values
        console.log('📦 Syncing Named Values...');
        const nvRes = await axios.get(`${baseUrl}/namedValues?api-version=2022-08-01`, { headers });
        const apimNamedValues = nvRes.data.value;

        for (const nv of apimNamedValues) {
            const properties = nv.properties || {};
            const tags = properties.tags || [];

            let scope = null;
            let productId = null;
            let apiId = null;

            if (tags.includes('scope:global')) {
                scope = 'GLOBAL';
            } else {
                const projectTag = tags.find((t: string) => t.startsWith('project:'));
                const apiTag = tags.find((t: string) => t.startsWith('api:'));
                if (projectTag) {
                    productId = projectTag.split(':')[1];
                    scope = 'PRODUCT';
                } else if (apiTag) {
                    apiId = apiTag.split(':')[1];
                    scope = 'API';
                }
            }

            const nvId = `${environment}-${nv.name}`;
            await pool.query(`
                INSERT INTO named_values (id, system_name, display_name, environment, value, is_secret, scope, product_id, scope_id, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                ON CONFLICT (environment, system_name) DO UPDATE SET
                    value = EXCLUDED.value,
                    scope = EXCLUDED.scope,
                    product_id = EXCLUDED.product_id,
                    scope_id = EXCLUDED.scope_id,
                    updated_at = NOW()
            `, [nvId, nv.name, properties.displayName || nv.name, environment, properties.value || '', properties.secret || false, scope, productId, apiId]);
        }
        console.log(`✅ Synced ${apimNamedValues.length} Named Values`);

        // 2. Sync Backends
        console.log('🔗 Syncing Backends...');
        const beRes = await axios.get(`${baseUrl}/backends?api-version=2022-08-01`, { headers });
        const apimBackends = beRes.data.value;

        for (const b of apimBackends) {
            const properties = b.properties || {};
            const description = properties.description || '';
            let scope = null;
            let productId = null;
            const tags = properties.tags || [];

            if (tags.includes('scope:global') || description.includes('[GLOBAL]')) {
                scope = 'GLOBAL';
            } else {
                const projectTag = tags.find((t: string) => t.startsWith('project:'));
                if (projectTag) {
                    productId = projectTag.split(':')[1];
                    scope = 'PRODUCT';
                }
            }

            await pool.query(`
                INSERT INTO governance_backends (id, environment, url, title, description, protocol, scope, product_id, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                ON CONFLICT (id, environment) DO UPDATE SET
                    url = EXCLUDED.url,
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    scope = EXCLUDED.scope,
                    product_id = EXCLUDED.product_id,
                    updated_at = NOW()
            `, [b.name, environment, properties.url || '', properties.title || b.name, description, properties.protocol || 'http', scope, productId]);
        }
        console.log(`✅ Synced ${apimBackends.length} Backends`);
    } catch (err) {
        console.error('❌ Sync failed:', err);
    } finally {
        await pool.end();
    }
}

sync();
