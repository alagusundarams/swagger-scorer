/**
 * @fileoverview Spec Fetcher Service
 * 
 * Fetches OpenAPI specifications from Git repos or Azure APIM
 */

import { query } from './db.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import simpleGit from 'simple-git';
import { execSync } from 'child_process';

/**
 * Fetch OpenAPI spec from a product's Git repository
 */
export async function fetchSpecFromGit(repoUrl: string, filePath?: string): Promise<string> {
    const repoPath = join(tmpdir(), `fetch-spec-${Date.now()}`);

    try {
        // Clone the repo
        const git = simpleGit();
        await git.clone(repoUrl, repoPath, ['--depth', '1']);

        // Read OpenAPI spec (default to swagger.yaml or openapi.yaml)
        const specPath = join(repoPath, filePath || 'openapi.yaml');
        const specContent = await readFile(specPath, 'utf-8');

        // Clean up
        await cleanupRepo(repoPath);

        return specContent;
    } catch (err) {
        // Try alternate filename
        try {
            const altPath = join(repoPath, 'swagger.yaml');
            const specContent = await readFile(altPath, 'utf-8');
            await cleanupRepo(repoPath);
            return specContent;
        } catch {
            await cleanupRepo(repoPath);
            throw new Error(`Failed to fetch spec from Git: ${err instanceof Error ? err.message : String(err)}`);
        }
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
 * Clean up temporary repo directory
 */
async function cleanupRepo(repoPath: string) {
    try {
        const { rm } = await import('fs/promises');
        await rm(repoPath, { recursive: true, force: true });
    } catch (err) {
        // Ignore cleanup errors
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
            return await fetchSpecFromGit(product.git_repo_url, product.git_file_path);
        } catch (gitErr) {
            console.warn(`Failed to fetch from Git, falling back to APIM:`, gitErr);
        }
    }

    // Fallback to APIM
    return await fetchSpecFromAPIM(product.id);
}
