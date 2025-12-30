/**
 * @fileoverview Spec Fetcher Service
 * 
 * Fetches OpenAPI specifications from Git repos or Azure APIM
 */

import { query } from './db.js';
import { execSync } from 'child_process';

/**
 * Fetch a single file from ADO/Git using REST API (No cloning)
 */
export async function fetchFileFromGitApi(repoUrl: string, filePath: string = 'openapi.yaml'): Promise<string> {
    try {
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

        const adoPat = process.env.ADO_PAT;
        if (!adoPat) {
            throw new Error('ADO_PAT environment variable is missing');
        }

        const authHeader = `Basic ${Buffer.from(`:${adoPat}`).toString('base64')}`;
        const apiUrl = `https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=${encodeURIComponent(filePath)}&api-version=6.0&$format=text`;

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
        // Get Azure access token
        const token = execSync('az account get-access-token --resource https://management.azure.com --query accessToken -o tsv', {
            encoding: 'utf-8'
        }).trim();

        // Get product from DB to find associated API
        const productResult = await query(`
            SELECT id, name FROM products WHERE id = $1
        `, [productId]);

        if (productResult.rows.length === 0) {
            throw new Error(`Product ${productId} not found`);
        }

        // Get first API for this product
        const apiResult = await query(`
            SELECT id, name FROM apis WHERE product_id = $1 LIMIT 1
        `, [productId]);

        if (apiResult.rows.length === 0) {
            throw new Error(`No APIs found for product ${productId}`);
        }

        const apiName = apiResult.rows[0].name;

        // Fetch from environment config (would need to be passed or stored)
        // For now, using hardcoded pattern - should be improved
        const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID || '';
        const resourceGroup = process.env.AZURE_RESOURCE_GROUP || '';
        const apimInstance = process.env.APIM_INSTANCE || '';

        if (!subscriptionId || !resourceGroup || !apimInstance) {
            throw new Error('Azure configuration missing (AZURE_SUBSCRIPTION_ID, AZURE_RESOURCE_GROUP, APIM_INSTANCE)');
        }

        const url = `https://management.azure.com/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ApiManagement/service/${apimInstance}/apis/${apiName}?export=true&format=openapi&api-version=2022-08-01`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`APIM API error: ${response.status} ${response.statusText}`);
        }

        const spec = await response.json();
        return JSON.stringify(spec, null, 2);
    } catch (err) {
        throw new Error(`Failed to fetch spec from APIM: ${err instanceof Error ? err.message : String(err)}`);
    }
}


/**
 * Fetch spec for a product (tries Git first, then APIM)
 */
export async function fetchSpecForProduct(productId: string): Promise<string> {
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
        try {
            return await fetchFileFromGitApi(product.git_repo_url, product.git_file_path);
        } catch (gitErr) {
            console.warn(`Failed to fetch from Git, falling back to APIM:`, gitErr);
        }
    }

    // Fallback to APIM
    return await fetchSpecFromAPIM(product.id);
}
