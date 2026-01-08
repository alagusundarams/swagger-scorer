/**
 * @fileoverview ADO Repo Service
 * 
 * Manages interactions with Azure DevOps Git Repositories.
 * Uses a temporary workspace to clone/pull repos for analysis.
 * 
 * STRATEGY:
 * 1. Clone repo to `os.tmpdir()/git-workspace/{productId}`
 * 2. Inspect latest commit hash.
 * 3. Inspect policy files if needed (though we prefer DB for speed).
 */

import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getAppConfig } from '../../../config/loader.js';

const WORKSPACE_DIR = 'apim-portal-workspace';

export interface AuthorInfo {
    name: string;
    email: string;
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export class RepoService {
    private workspacePath: string;

    constructor(customPath?: string) {
        this.workspacePath = customPath || path.join(os.tmpdir(), WORKSPACE_DIR);
        this.ensureWorkspace();
    }

    private ensureWorkspace() {
        if (!fs.existsSync(this.workspacePath)) {
            fs.mkdirSync(this.workspacePath, { recursive: true });
        }
    }

    /**
     * Validate a Repository URL.
     * Checks format, reachability, and boundary constraints.
     */
    async validateRepoUrl(url: string, requiredOrg?: string): Promise<ValidationResult> {
        if (!url || !url.startsWith('https://')) {
            return { isValid: false, error: 'Invalid URL format. Must start with https://' };
        }

        if (requiredOrg && !url.includes(requiredOrg)) {
            return { isValid: false, error: `Repository must belong to organization: ${requiredOrg}` };
        }

        try {
            // Shallow check using ls-remote to verify existence/reachability
            // We use the system git, assuming auth is handled via environment or keychain for this Service Account
            await simpleGit().listRemote([url, 'HEAD']);
            return { isValid: true };
        } catch (error: any) {
            console.warn(`[RepoService] Validation failed for ${url}:`, error.message);
            // Distinguish between Auth error vs Not Found if possible
            if (error.message.includes('Authentication failed')) return { isValid: false, error: 'Authentication failed. Check permissions.' };
            return { isValid: false, error: 'Repository not reachable or does not exist.' };
        }
    }

    /**
     * Retrieve the latest commit metadata for a specific file path.
     * Used for Granular API Status checks.
     */
    async getCommitMetadata(repoUrl: string, filePath: string, branch: string = 'main'): Promise<{ hash: string; date: string; author: string } | null> {
        // Create a temporary, unique workspace for this metadata check to avoid locking
        const tempDir = path.join(os.tmpdir(), `metadata-check-${Math.random().toString(36).substring(7)}`);
        fs.mkdirSync(tempDir, { recursive: true });

        try {
            const git = simpleGit(tempDir);
            await git.init();
            await git.addRemote('origin', repoUrl);

            // Fetch only key info (shallow)
            await git.fetch(['origin', branch, '--depth=1']);

            // Get log for the specific file
            // Note: Since we did a partial fetch, we might need to be careful. 
            // For performance on huge repos, Azure DevOps API is better.
            // But sticking to 'No New Infra', we use simple-git.

            // Check if we can get log from remote directly? No.
            // Full checkout is too heavy. 
            // Optimized approach: ls-remote for HEAD hash is fast.
            // For FILE SPECIFIC history, we ideally need the API.
            // Fallback: We return the Repo HEAD hash as a proxy for the file if file specific is too expensive.
            // OR: We assume the local workspace is synced (via syncRepo) and query that.

            // Let's use the local workspace cache if available for speed
            const productId = repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
            const cachedPath = path.join(this.workspacePath, productId);

            if (fs.existsSync(cachedPath)) {
                const cachedGit = simpleGit(cachedPath);
                // Ensure it is fresh
                await cachedGit.fetch();
                const log = await cachedGit.log(['-n', '1', `origin/${branch}`, '--', filePath]);
                if (log.latest) {
                    return {
                        hash: log.latest.hash,
                        date: log.latest.date,
                        author: log.latest.author_name
                    };
                }
            }

            return null; // File not found or no history
        } catch (e) {
            console.warn(`[RepoService] Metadata fetch failed:`, e);
            return null;
        } finally {
            // Cleanup temp
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }

    /**
     * Clones or Pulls a repository for a specific Product.
     * Returns the local path and the latest commit hash.
     */
    async syncRepo(productId: string, repoUrl: string): Promise<{ path: string, commitHash: string }> {
        const config = getAppConfig();
        const localPath = path.join(this.workspacePath, productId);
        const isLocalOnly = !repoUrl || repoUrl.includes('local') || config.gitLocalOnly;

        let git: SimpleGit;

        try {
            if (fs.existsSync(localPath) && fs.existsSync(path.join(localPath, '.git'))) {
                git = simpleGit(localPath);
                if (!isLocalOnly) {
                    try {
                        await git.pull();
                    } catch (e) {
                        console.warn(`[ADO] Pull failed for ${productId}, continuing with local state:`, e);
                    }
                }
            } else {
                if (!fs.existsSync(localPath)) {
                    fs.mkdirSync(localPath, { recursive: true });
                }
                git = simpleGit(localPath);

                if (isLocalOnly) {
                    await git.init();
                } else {
                    await simpleGit().clone(repoUrl, localPath);
                }
            }

            const log = await git.log({ maxCount: 1 }).catch(() => null);
            const latestHash = log?.latest?.hash || 'initial';

            return { path: localPath, commitHash: latestHash };

        } catch (error) {
            console.error(`[ADO] Failed to sync repo for ${productId}:`, error);
            throw new Error(`Git Sync Failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Commits and pushes a set of files to the repository.
     */
    async commitFiles(productId: string, repoUrl: string, files: { path: string, content: string }[], message: string): Promise<string> {
        const config = getAppConfig();
        const { path: localPath } = await this.syncRepo(productId, repoUrl);
        const isLocalOnly = !repoUrl || repoUrl.includes('local') || config.gitLocalOnly;
        const git = simpleGit(localPath);

        for (const file of files) {
            const fullPath = path.join(localPath, file.path);
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fullPath, file.content);
        }

        await git.add('.');
        const commit = await git.commit(message);

        if (commit.commit) {
            if (!isLocalOnly) {
                try {
                    await git.push();
                } catch (e) {
                    console.warn(`[ADO] Push failed for ${productId}, but local commit successful.`, e);
                }
            }
            const log = await git.log({ maxCount: 1 });
            return log.latest?.hash || 'unknown';
        }

        return 'no-changes';
    }
    /**
     * Reads a file's content from the repository.
     */
    async getFileContent(productId: string, repoUrl: string, filePath: string): Promise<string | null> {
        try {
            const { path: localPath } = await this.syncRepo(productId, repoUrl);
            const fullPath = path.join(localPath, filePath);

            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, 'utf-8');
            }
            return null;
        } catch (error) {
            console.error(`[ADO] Failed to read file ${filePath} for ${productId}:`, error);
            return null;
        }
    }

    /**
     * Lists all files in the repository recursively.
     * Returns relative paths.
     */
    async listRepoFiles(productId: string, repoUrl: string): Promise<string[]> {
        const { path: localPath } = await this.syncRepo(productId, repoUrl);

        const walk = (dir: string): string[] => {
            let results: string[] = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                file = path.join(dir, file);
                const stat = fs.statSync(file);
                if (stat && stat.isDirectory()) {
                    if (!file.includes('.git')) {
                        results = results.concat(walk(file));
                    }
                } else {
                    results.push(path.relative(localPath, file));
                }
            });
            return results;
        };

        return walk(localPath);
    }

    /**
     * Checks if a file exists in the repository.
     */
    async existsInRepo(productId: string, repoUrl: string, filePath: string): Promise<boolean> {
        const { path: localPath } = await this.syncRepo(productId, repoUrl);
        const fullPath = path.join(localPath, filePath);
        return fs.existsSync(fullPath);
    }
}
