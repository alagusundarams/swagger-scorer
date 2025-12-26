/**
 * @fileoverview Git Repo and tfvars Integration
 * 
 * Helper functions to clone repos, find tfvars, and extract mappings
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseTfvars, TfvarsData, findAPIInTfvars, findProductInTfvars, getAPIContractPath } from '../utils/tfvars-parser.js';
import { readFileSync } from 'fs';

/**
 * Extract dependencies from policy XML (send-request, etc)
 */
export function extractDependenciesFromPolicy(xmlContent: string): string[] {
    const dependencies: Set<string> = new Set();

    // 1. Find <send-request ... base-url="...">
    const sendReqRegex = /<send-request[^>]*base-url=["']([^"']+)["']/g;
    let match;
    while ((match = sendReqRegex.exec(xmlContent)) !== null) {
        dependencies.add(match[1]);
    }

    // 2. Find internal APIM calls via paths (e.g. forward-request to specific backends)
    const backendRegex = /<set-backend-service[^>]*backend-id=["']([^"']+)["']/g;
    while ((match = backendRegex.exec(xmlContent)) !== null) {
        dependencies.add(`backend://${match[1]}`);
    }

    return Array.from(dependencies);
}

/**
 * Clone a Git repository to a temporary directory
 */
export async function cloneRepo(repoUrl: string): Promise<string> {
    const repoPath = join(tmpdir(), `apim-repo-${Date.now()}`);

    try {
        console.log(`  📥 Cloning ${repoUrl}...`);
        execSync(`git clone --depth 1 "${repoUrl}" "${repoPath}"`, {
            stdio: 'pipe',
            encoding: 'utf-8'
        });
        return repoPath;
    } catch (err) {
        throw new Error(`Failed to clone repo: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/**
 * Find IAC folder in repo (handles various naming conventions)
 */
export function findIACFolder(repoPath: string): string | null {
    const possibleNames = ['IAC', 'iac', 'Iac', 'infrastructure'];

    for (const name of possibleNames) {
        const iacPath = join(repoPath, name);
        if (existsSync(iacPath) && statSync(iacPath).isDirectory()) {
            return iacPath;
        }
    }

    return null;
}

/**
 * Find Maintain folder in IAC (e.g., Maintain_<reponame> or maintain_grp_<productname>)
 */
export function findMaintainFolder(iacPath: string): string | null {
    try {
        const entries = readdirSync(iacPath);

        for (const entry of entries) {
            const entryPath = join(iacPath, entry);
            if (statSync(entryPath).isDirectory() &&
                (entry.toLowerCase().startsWith('maintain_') || entry.toLowerCase().startsWith('maintain'))) {
                return entryPath;
            }
        }
    } catch (err) {
        // Ignore errors
    }

    return null;
}

/**
 * Find all tfvars files for different environments
 */
export function findTfvarsFiles(maintainFolder: string): string[] {
    try {
        const entries = readdirSync(maintainFolder);
        return entries
            .filter(f => f.startsWith('terraform_') && f.endsWith('.tfvars'))
            .map(f => join(maintainFolder, f));
    } catch (err) {
        return [];
    }
}

/**
 * Parse all tfvars files and merge them
 */
export function parseAllTfvars(tfvarsFiles: string[]): TfvarsData {
    const merged: TfvarsData = {
        apis: [],
        products: []
    };

    for (const file of tfvarsFiles) {
        const data = parseTfvars(file);

        // Merge arrays
        if (data.apis) merged.apis = [...(merged.apis || []), ...data.apis];
        if (data.products) merged.products = [...(merged.products || []), ...data.products];
    }

    return merged;
}

/**
 * Check if repo is a GRP product (no API folder)
 */
export function isGRPProduct(repoPath: string): boolean {
    const apiPath = join(repoPath, 'API');
    return !existsSync(apiPath);
}

/**
 * Clean up cloned repo
 */
export async function cleanupRepo(repoPath: string): Promise<void> {
    try {
        const { rm } = await import('fs/promises');
        await rm(repoPath, { recursive: true, force: true });
    } catch (err) {
        // Ignore cleanup errors
    }
}

/**
 * Extract Git info for a product from its repo
 */
export async function extractProductGitInfo(
    productName: string,
    repoUrl: string
): Promise<{ gitInfo: any; tfvarsData: TfvarsData } | null> {
    let repoPath: string | null = null;

    try {
        // Clone repo
        repoPath = await cloneRepo(repoUrl);

        // Find IAC folder
        const iacPath = findIACFolder(repoPath);
        if (!iacPath) {
            console.warn(`  ⚠️  No IAC folder found in ${repoUrl}`);
            return null;
        }

        // Find Maintain folder
        const maintainPath = findMaintainFolder(iacPath);
        if (!maintainPath) {
            console.warn(`  ⚠️  No Maintain folder found in IAC`);
            return null;
        }

        // Find and parse tfvars files
        const tfvarsFiles = findTfvarsFiles(maintainPath);
        if (tfvarsFiles.length === 0) {
            console.warn(`  ⚠️  No tfvars files found in ${maintainPath}`);
            return null;
        }

        console.log(`  📄 Found ${tfvarsFiles.length} tfvars files`);
        const tfvarsData = parseAllTfvars(tfvarsFiles);

        // Determine if GRP
        const isGRP = isGRPProduct(repoPath);

        // Get latest commit info
        const lastCommit = execSync('git rev-parse --short HEAD', {
            cwd: repoPath,
            encoding: 'utf-8'
        }).trim();

        const lastCommitDate = execSync('git log -1 --format=%aI', {
            cwd: repoPath,
            encoding: 'utf-8'
        }).trim();

        // Find which specific tfvars file defining this product and its APIs
        let tfvarsLine: number | null = null;
        let tfvarsFile: string | null = null;
        const apiLines: Record<string, number> = {};
        const { findLineNumber } = await import('../utils/tfvars-parser.js');

        // Product Line
        for (const file of tfvarsFiles) {
            const line = findLineNumber(file, productName);
            if (line) {
                tfvarsLine = line;
                tfvarsFile = 'IAC/' + maintainPath.split('/').pop() + '/' + file.split('/').pop();
                break;
            }
        }

        // API Lines
        for (const file of tfvarsFiles) {
            if (tfvarsData.apis) {
                for (const api of tfvarsData.apis) {
                    if (!apiLines[api.name]) {
                        const line = findLineNumber(file, api.name);
                        if (line) apiLines[api.name] = line;
                    }
                }
            }
        }

        // Find tfvars product for dependency analysis
        const tfvarsProduct = findProductInTfvars(productName, tfvarsData);

        // Dependency Analysis: Scan Product Policy
        const productDependencies: string[] = [];
        if (tfvarsProduct && tfvarsProduct.product_policy_path && tfvarsProduct.product_policy) {
            try {
                const policyPath = join(repoPath, tfvarsProduct.product_policy_path, tfvarsProduct.product_policy);
                if (existsSync(policyPath)) {
                    const content = readFileSync(policyPath, 'utf-8');
                    productDependencies.push(...extractDependenciesFromPolicy(content));
                }
            } catch (err) { /* ignore */ }
        }

        // Dependency Analysis: Scan API Policies
        const apiDependencies: Record<string, string[]> = {};
        if (tfvarsData.apis) {
            for (const api of tfvarsData.apis) {
                if (api.api_policy_path && api.api_policy_file) {
                    try {
                        const policyPath = join(repoPath, api.api_policy_path, api.api_policy_file);
                        if (existsSync(policyPath)) {
                            const content = readFileSync(policyPath, 'utf-8');
                            apiDependencies[api.name] = extractDependenciesFromPolicy(content);
                        }
                    } catch (err) { /* ignore */ }
                }
            }
        }

        const gitInfo = {
            repoUrl,
            lastCommit,
            lastCommitDate,
            isGRP,
            iacPath: 'IAC/' + maintainPath.split('/').pop(),
            tfvarsFile,
            tfvarsLine,
            apiLines,
            productDependencies,
            apiDependencies
        };

        return { gitInfo, tfvarsData };
    } catch (err) {
        console.error(`  ❌ Failed to process repo ${repoUrl}:`, err instanceof Error ? err.message : String(err));
        return null;
    } finally {
        if (repoPath) {
            await cleanupRepo(repoPath);
        }
    }
}
