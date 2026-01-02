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
import { getAppConfig } from '../../config/loader.js';

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
}
