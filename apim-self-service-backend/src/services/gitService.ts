
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';

/**
 * Git Service for Delete Saga
 * 
 * Handles backing up and removing resources from Git repositories 
 * as part of the deletion workflow.
 */



export class GitService {
    private git: SimpleGit;
    private localRepoPath: string;

    constructor(repoPath?: string) {
        // Use provided path or default to a temp directory for safe isolation
        this.localRepoPath = repoPath || path.join(tmpdir(), 'apim-git-ops');

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
    }

    /**
     * Backs up a resource delete operation by creating a deletion branch.
     * 
     * Workflow:
     * 1. Checkout main
     * 2. Pull latest
     * 3. Create branch feature/delete-<id>
     * 4. Remove file (git rm)
     * 5. Commit
     * 6. Push
     * 
     * @returns The branch name created
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
}
