import fs from 'fs';
import fsPromises from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { getAppConfig } from '../../config/loader.js';

/**
 * GitService
 * 
 * Unified Service for Git Operations:
 * - Real GitOps (via simple-git)
 * - Policy Management (fetch/commit)
 * - Simulation (for demos)
 */
export class GitService {
    private git: SimpleGit;
    private localRepoPath: string;
    // private initialized: boolean = false; // Unused

    constructor(repoPath?: string) {
        // Use provided path or default to a system temp directory for safe isolation
        // Or check config if available later
        const config = getAppConfig();
        this.localRepoPath = repoPath || config.gitLocalPath || path.join(tmpdir(), 'apim-git-ops');

        const options: Partial<SimpleGitOptions> = {
            baseDir: this.localRepoPath,
            binary: 'git',
            maxConcurrentProcesses: 6,
            trimmed: false,
        };

        // Ensure directory exists if we are going to clone into it
        if (!fs.existsSync(this.localRepoPath)) {
            fs.mkdirSync(this.localRepoPath, { recursive: true });
        }

        this.git = simpleGit(options);
    }

    /**
     * Clones or Opens a repository
     */
    async initializeRepo(repoUrl: string, mappedPath?: string): Promise<void> {
        // If mappedPath is provided, use it (assumes persistent volume/local dev)
        if (mappedPath) {
            this.localRepoPath = mappedPath;
            if (!fs.existsSync(this.localRepoPath)) {
                throw new Error(`Local repository path not found: ${mappedPath}`);
            }
            this.git = simpleGit({ baseDir: this.localRepoPath });
            // Check if it's a git repo
            const isRepo = await this.git.checkIsRepo();
            if (!isRepo) {
                throw new Error(`Path is not a git repository: ${mappedPath}`);
            }
            return;
        }

        // Otherwise, clone into temp (Ephemeral Mode)
        // Check if already cloned
        if (fs.existsSync(path.join(this.localRepoPath, '.git'))) {
            // Already exists, just fetch
            await this.git.fetch();
        } else {
            // Clone
            await simpleGit().clone(repoUrl, this.localRepoPath);
            this.git = simpleGit({ baseDir: this.localRepoPath });
        }
        // this.initialized = true;
    }

    /**
     * Backs up a resource delete operation by creating a deletion branch.
     */
    async createDeletionBranch(
        repoUrl: string,
        filePath: string,
        resourceId: string,
        user: { name: string, email: string },
        localPath?: string
    ): Promise<{ success: boolean; branch: string; hash?: string; error?: string }> {
        const branchName = `feature/delete-${resourceId.toLowerCase()}-${Date.now()}`;

        try {
            await this.initializeRepo(repoUrl, localPath);

            // Configure User
            await this.git.addConfig('user.name', user.name);
            await this.git.addConfig('user.email', user.email);

            // Checkout Main & Update
            await this.git.checkout('main');
            await this.git.pull();

            // Create Branch
            await this.git.checkoutLocalBranch(branchName);

            // Delete File
            const fullPath = path.join(this.localRepoPath, filePath);
            if (fs.existsSync(fullPath)) {
                await this.git.rm(filePath);

                // Commit
                const commitResult = await this.git.commit(`chore: delete resource ${resourceId} [skip ci]`);

                // Push
                // Note: In real setup, we need credentials. 
                // Assuming repoUrl includes token or SSH agent is configured.
                await this.git.push('origin', branchName);

                return {
                    success: true,
                    branch: branchName,
                    hash: commitResult.commit
                };
            } else {
                return {
                    success: false,
                    branch: branchName,
                    error: `File not found: ${filePath}`
                };
            }

        } catch (error: any) {
            return {
                success: false,
                branch: branchName,
                error: error.message
            };
        }
    }

    /**
     * Creates a branch, writes/updates a resource file, commits, and pushes.
     * Used for Product/API creation or updates.
     */
    async commitResource(
        repoUrl: string,
        filePath: string,
        fileContent: string,
        resourceId: string,
        resourceType: 'product' | 'api' | 'named_value' | 'backend',
        commitMessage: string,
        user: { name: string, email: string },
        localPath?: string
    ): Promise<{ success: boolean; branch: string; hash?: string; error?: string }> {
        const branchName = `feature/${resourceType}-${resourceId.toLowerCase()}-${Date.now()}`;

        try {
            await this.initializeRepo(repoUrl, localPath);

            // Configure User
            await this.git.addConfig('user.name', user.name);
            await this.git.addConfig('user.email', user.email);

            // Checkout Main & Update
            await this.git.checkout('main');
            await this.git.pull();

            // Create Branch
            await this.git.checkoutLocalBranch(branchName);

            // Ensure Directory Exists
            const fullPath = path.join(this.localRepoPath, filePath);
            const dirPath = path.dirname(fullPath);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }

            // Write Content
            fs.writeFileSync(fullPath, fileContent, 'utf-8');

            // Add & Commit
            await this.git.add(filePath);
            const commitResult = await this.git.commit(commitMessage);

            // Push
            await this.git.push('origin', branchName);

            return {
                success: true,
                branch: branchName,
                hash: commitResult.commit
            };

        } catch (error: any) {
            console.error('[GitService] Commit Resource Failed:', error);
            return {
                success: false,
                branch: branchName,
                error: error.message
            };
        }
    }

    /**
     * Commits a policy change to the simulated repository (Legacy/Policy method).
     */
    public async commitPolicy(resourceId: string, xml: string, justification: string, user: string, repoUrl?: string): Promise<{ commitId: string; timestamp: string; error?: string }> {
        // Use commitResource internal wrapper if possible, or simplified logic?
        // Let's keep specific logic for now to minimize risk.
        if (!repoUrl) {
            console.warn(`[GitOps] No repository linked for ${resourceId}. GitOps skipped.`);
            return { commitId: 'N/A', timestamp: new Date().toISOString(), error: 'NO_REPO_LINKED' };
        }

        // Re-use ensure logic via initializeRepo?
        // This method assumes simpler workflow (direct file write in repoPath).
        // Adapting to use initializeRepo:
        try {
            await this.initializeRepo(repoUrl);
            const fileName = `${resourceId.replace(/[^a-zA-Z0-9]/g, '_')}.xml`;
            const filePath = path.join(this.localRepoPath, 'policies', fileName);

            // Write
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, xml, 'utf8');

            // Commit
            await this.git.add(filePath);
            const commit = await this.git.commit(`chore(policy): update ${resourceId} - ${justification} [by ${user}]`);

            return { commitId: commit.commit, timestamp: new Date().toISOString() };
        } catch (e: any) {
            console.error('[GitService] commitPolicy failed', e);
            return { commitId: 'error', timestamp: new Date().toISOString(), error: e.message };
        }
    }

    /**
     * Fetches a policy XML from the repository.
     */
    public async fetchPolicy(resourceId: string, repoUrl: string, level: string = 'api'): Promise<{ xml: string; filePath: string }> {
        await this.initializeRepo(repoUrl);

        console.log(`[GitService] Fetching ${level} policy for ${resourceId} from ${repoUrl}`);

        const sanitizedId = resourceId.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${sanitizedId}.xml`;
        const subDir = level === 'product' ? 'products' : level === 'operation' ? 'operations' : 'apis';
        const filePath = path.join(this.localRepoPath, 'policies', subDir, fileName);

        if (!existsSync(filePath)) {
            const mockXml = `<policies>\n    <inbound>\n        <base />\n        <!-- ${level.toUpperCase()} Policy for ${resourceId} -->\n    </inbound>\n</policies>`;
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, mockXml, 'utf8');
            return { xml: mockXml, filePath };
        }

        const xml = await fsPromises.readFile(filePath, 'utf8');
        return { xml, filePath };
    }
}

/**
 * Simulates a Git Commit & Push (Exported for Approvals usage)
 */
export async function simulateDeployCommit(
    productId: string,
    environment: string,
    options?: { authorName?: string; authorEmail?: string; message?: string }
) {
    const branchName = `feature/${productId}-${environment.toLowerCase()}-deploy`;
    const hash = Math.random().toString(36).substring(2, 9);
    const author = options?.authorName ? `${options.authorName} <${options.authorEmail}>` : 'Service Account';
    console.log(`[Git] Committing to ${branchName} by ${author}`);

    return {
        success: true,
        hash: hash,
        branch: branchName,
        repoUrl: `https://dev.azure.com/myorg/apim/_git/${productId}`,
        timestamp: new Date()
    };
}
