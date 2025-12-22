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

const WORKSPACE_DIR = 'apim-portal-workspace';

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
     * Clones or Pulls a repository for a specific Product.
     * Returns the local path and the latest commit hash.
     */
    async syncRepo(productId: string, repoUrl: string): Promise<{ path: string, commitHash: string }> {
        const localPath = path.join(this.workspacePath, productId);

        if (process.env.USE_BACKEND_MOCKS === 'true') {
            console.log(`☁️ [MOCK_MODE] Simulating Git Sync for ${productId}...`);
            this.ensureWorkspace();

            // Create a fake folder if it doesn't exist
            if (!fs.existsSync(localPath)) {
                fs.mkdirSync(localPath, { recursive: true });
            }

            // Return fake hash for Modern product, fake 'init' for others
            if (productId.includes('payment-v2')) {
                return { path: localPath, commitHash: 'a1b2c3d' };
            }
            return { path: localPath, commitHash: '0000000' };
        }

        let git: SimpleGit;

        try {
            if (fs.existsSync(localPath) && fs.existsSync(path.join(localPath, '.git'))) {
                // Repo exists: PULL
                // console.log(`[ADO] Pulling existing repo for ${productId}...`);
                git = simpleGit(localPath);
                await git.pull();
            } else {
                // Repo missing: CLONE
                // console.log(`[ADO] Cloning repo for ${productId}...`);
                await simpleGit().clone(repoUrl, localPath);
                git = simpleGit(localPath);
            }

            const log = await git.log({ maxCount: 1 });
            const latestHash = log.latest?.hash || 'unknown';

            return { path: localPath, commitHash: latestHash };

        } catch (error) {
            console.error(`[ADO] Failed to sync repo for ${productId}:`, error);
            throw new Error(`Git Sync Failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
