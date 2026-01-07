/**
 * @fileoverview Spec Fetcher Service
 * 
 * Fetches OpenAPI specifications from Git repos or Azure APIM
 */

import { query } from '../core/db.js';
import { execSync } from 'child_process';
import { getAppConfig } from '../../config/loader.js';

/**
 * Fetch a single file from ADO/Git using REST API (No cloning)
 */
export async function fetchFileFromGitApi(repoUrl: string, filePath: string = 'openapi.yaml'): Promise<string> {
    try {
        const config = getAppConfig();
        // Parse ADO URL: https://dev.azure.com/{org}/{project}/_git/{repo}
        const url = new URL(repoUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);

        let org, project, repo;

        if (url.hostname === 'dev.azure.com') {
            org = pathParts[0];
            project = pathParts[1];
            repo = pathParts[3]; // Skip '_git'
        } else if (url.hostname.includes('.visualstudio.com')) {
            org = url.hostname.split('.')[0];
            project = pathParts[0];
            repo = pathParts[2]; // Skip '_git'
        }

        if (!org || !project || !repo) {
            throw new Error('Unsupported or invalid Git URL format');
        }

        const adoPat = config.devops.pat;
        if (!adoPat || adoPat === 'your-read-only-pat') {
            throw new Error('ADO_PAT is missing or using default placeholder in config');
        }

        const authHeader = `Basic ${Buffer.from(`:${adoPat}`).toString('base64')}`;
        const apiUrl = `https://dev.azure.com/${org}/${project}/_apis/g../../repositories/${repo}/items?path=${encodeURIComponent(filePath)}&api-version=6.0&$format=text`;

        const response = await fetch(apiUrl, {
            headers: { 'Authorization': authHeader }
        });

        if (!response.ok) {
            if (response.status === 404 && filePath === 'openapi.yaml') {
                // Try fallback to swagger.yaml
                return fetchFileFromGitApi(repoUrl, 'swagger.yaml');
            }
            throw new Error(`Git API error: ${response.status} ${response.statusText}`);
        }

        return await response.text();
    } catch (err) {
        throw new Error(`Failed to fetch file from Git API: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/**
 * Fetch OpenAPI spec from Azure APIM live
 */
export async function fetchSpecFromAPIM(productId: string): Promise<string> {
    try {
        const config = getAppConfig();
        // Get Azure access token
        const token = execSync('az account get-access-token --resource https://management.azure.com --query accessToken -o tsv', {
            encoding: 'utf-8'
        }).trim();

        // Get product from DB to find associated API and environment
        const productResult = await query(`
            SELECT id, name, environment FROM products WHERE id = $1
        `, [productId]);

        if (productResult.rows.length === 0) {
            throw new Error(`Product ${productId} not found`);
        }

        const product = productResult.rows[0];

        // Find matching Azure environment in config
        const envConfig = config.azure.environments.find(e => e.name.toUpperCase() === product.environment?.toUpperCase());

        if (!envConfig) {
            throw new Error(`Azure environment configuration not found for: ${product.environment}`);
        }

        const { subscriptionId, resourceGroup, instance: apimInstance } = envConfig;

        // Get first API for this product
        const apiResult = await query(`
            SELECT id, name FROM apis WHERE product_id = $1 LIMIT 1
        `, [productId]);

        if (apiResult.rows.length === 0) {
            throw new Error(`No APIs found for product ${productId}`);
        }

        const apiName = apiResult.rows[0].name;

        if (!subscriptionId || !resourceGroup || !apimInstance) {
            throw new Error(`Azure configuration missing for ${product.environment} (subscriptionId, resourceGroup, instance)`);
        }

        console.log(`[SpecFetcher] Exporting API spec for ${apiName} (${product.environment})...`);
        const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ApiManagement/service/${apimInstance}/apis/${apiName}?export=true&format=openapi&api-version=2022-08-01`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No body');
            console.error(`[SpecFetcher] APIM Error: ${response.status}`, errorText);
            throw new Error(`APIM API error: ${response.status} ${response.statusText}`);
        }

        const specText = await response.text();
        console.log(`[SpecFetcher] Received spec (length: ${specText.length}, starts with: ${specText.substring(0, 20).replace(/\n/g, '\\n')})`);

        return specText; // Return as-is (JSON or YAML)
    } catch (err: any) {
        console.error(`[SpecFetcher] Failed to fetch from APIM:`, err.message);
        throw new Error(`Failed to fetch spec from APIM: ${err instanceof Error ? err.message : String(err)}`);
    }
}


/**
 * Fetch spec for a product (tries Git first, then APIM)
 */
export async function fetchSpecForProduct(productId: string): Promise<string> {
    console.log(`[SpecFetcher] Fetching spec for ${productId}...`);
    // Get product from database
    const result = await query(`
        SELECT id, name, git_repo_url, git_file_path, environment
        FROM products
        WHERE id = $1
    `, [productId]);

    if (result.rows.length === 0) {
        throw new Error(`Product ${productId} not found`);
    }

    const product = result.rows[0];

    // Try Git first if available
    if (product.git_repo_url) {
        console.log(`[SpecFetcher] Attempting Git fetch from ${product.git_repo_url} / ${product.git_file_path || 'openapi.yaml'}`);
        try {
            const spec = await fetchFileFromGitApi(product.git_repo_url, product.git_file_path);
            console.log(`[SpecFetcher] ✅ Successfully fetched from Git`);
            return spec;
        } catch (gitErr) {
            console.warn(`[SpecFetcher] ⚠️ Failed to fetch from Git, falling back to APIM:`, gitErr instanceof Error ? gitErr.message : gitErr);
        }
    } else {
        console.log(`[SpecFetcher] No Git repo linked, proceeding direct to APIM`);
    }

    // Fallback to APIM
    return await fetchSpecFromAPIM(product.id);
}
