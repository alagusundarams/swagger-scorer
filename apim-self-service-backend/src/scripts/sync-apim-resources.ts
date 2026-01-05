import 'dotenv/config';
import { ArmService } from '../services/apim/ArmService.js';
import { query } from '../services/db.js';
import axios from 'axios';

/**
 * Smart Extraction Engine: APIM Resource Sync
 */

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
    const environment = process.env.SYNC_ENV || 'DEV';
    const token = await getAccessToken();

    const arm = new ArmService({
        subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || 'mock-sub',
        resourceGroup: process.env.AZURE_RESOURCE_GROUP || 'mock-rg',
        serviceName: process.env.APIM_SERVICE_NAME || 'mock-apim',
        accessToken: token
    });

    try {
        // 1. Sync Named Values
        console.log('📦 Syncing Named Values...');
        const apimNamedValues = await arm.getNamedValues();
        for (const nv of apimNamedValues) {
            const properties = nv.properties || {};
            const tags = properties.tags || [];

            let scope: string | null = null;
            let productId: string | null = null;
            let apiId: string | null = null;

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
            await query(`
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
        const apimBackends = await arm.getBackends();
        for (const b of apimBackends) {
            const properties = b.properties || {};
            const description = properties.description || '';
            let scope: string | null = null;
            let productId: string | null = null;
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

            await query(`
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
    }
    process.exit(0);
}
sync();
