/**
 * @fileoverview Scoring Service
 * 
 * Background job to score products asynchronously
 */

import { query } from './db.js';
import { analyzeOpenAPI } from './analyzer.service.js';
import simpleGit from 'simple-git';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Score all products that don't have quality scores yet
 */
export async function scoreAllProducts() {
    console.log('🔍 Starting background scoring job...');

    try {
        // Get all products without scores
        const result = await query(`
            SELECT id, name, git_repo_url, git_file_path
            FROM products
            WHERE quality_score IS NULL
            ORDER BY created_at DESC
            LIMIT 100
        `);

        if (result.rows.length === 0) {
            console.log('  ℹ️  No products need scoring');
            return { scored: 0, failed: 0, skipped: 0 };
        }

        console.log(`  📊 Found ${result.rows.length} products to score`);

        let scored = 0;
        let failed = 0;
        let skipped = 0;

        for (const product of result.rows) {
            try {
                const score = await scoreProduct(
                    product.id,
                    product.git_repo_url,
                    product.git_file_path
                );

                if (score !== null) {
                    // Update database
                    await query(`
                        UPDATE products
                        SET quality_score = $1, updated_at = NOW()
                        WHERE id = $2
                    `, [score, product.id]);

                    console.log(`  ✅ Scored ${product.name}: ${score}`);
                    scored++;
                } else {
                    console.log(`  ⚠️  Skipped ${product.name}: No OpenAPI spec found`);
                    skipped++;
                }
            } catch (err) {
                console.warn(`  ❌ Failed to score ${product.name}:`, err instanceof Error ? err.message : String(err));
                failed++;
            }
        }

        console.log(`✅ Background scoring complete: ${scored} scored, ${skipped} skipped, ${failed} failed`);
        return { scored, failed, skipped };
    } catch (err) {
        console.error('❌ Background scoring job failed:', err);
        throw err;
    }
}

/**
 * Score a single product by fetching and analyzing its OpenAPI spec
 */
async function scoreProduct(
    productId: string,
    gitRepoUrl: string | null,
    gitFilePath: string | null
): Promise<number | null> {
    // If no Git repo, can't score
    if (!gitRepoUrl) {
        return null;
    }

    const repoPath = join(tmpdir(), `scoring-${productId}-${Date.now()}`);

    try {
        // Clone the repo
        console.log(`    📥 Cloning ${gitRepoUrl}...`);
        const git = simpleGit();
        await git.clone(gitRepoUrl, repoPath, ['--depth', '1']);

        // Read OpenAPI spec
        const specPath = join(repoPath, gitFilePath || 'openapi.yaml');
        const specContent = await readFile(specPath, 'utf-8');

        // Analyze and get score
        const analysis = await analyzeOpenAPI(specContent);

        // Clean up repo
        await cleanupRepo(repoPath);

        return analysis.qualityScore;
    } catch (err) {
        // Clean up on error
        await cleanupRepo(repoPath);
        throw err;
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
        console.warn(`    ⚠️  Failed to cleanup ${repoPath}`);
    }
}

/**
 * Score a specific product by ID
 */
export async function scoreProductById(productId: string): Promise<number | null> {
    const result = await query(`
        SELECT id, name, git_repo_url, git_file_path
        FROM products
        WHERE id = $1
    `, [productId]);

    if (result.rows.length === 0) {
        throw new Error(`Product ${productId} not found`);
    }

    const product = result.rows[0];
    const score = await scoreProduct(
        product.id,
        product.git_repo_url,
        product.git_file_path
    );

    if (score !== null) {
        await query(`
            UPDATE products
            SET quality_score = $1, updated_at = NOW()
            WHERE id = $2
        `, [score, product.id]);
    }

    return score;
}
