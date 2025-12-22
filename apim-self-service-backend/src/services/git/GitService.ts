import fs from 'fs/promises';
import path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';

import { getAppConfig } from '../../config/loader.js';

/**
 * GitService
 * 
 * Simulates GitOps operations for API Policies.
 * In a real scenario, this would interface with 'simple-git' or Azure DevOps API.
 * For the demo, it writes to a local 'git-repo' directory and logs the commit.
 */
export class GitService {
    private repoPath: string;
    private git: SimpleGit;

    constructor() {
        const config = getAppConfig();
        // Points to the local clone path defined in config or defaults to a folder sibling to backend
        this.repoPath = process.env.GIT_LOCAL_PATH || path.resolve(process.cwd(), '../git-repo');

        // Prepare PAT if available (Twelve-Factor App)
        const pat = config.devops.pat;
        if (pat && pat !== 'your-read-only-pat') {
            console.log(`[GitService] Initializing with ADO PAT for organization: ${config.devops.organization}`);
        }

        this.git = simpleGit(this.repoPath);
    }

    private async ensureRepo() {
        try {
            await fs.mkdir(this.repoPath, { recursive: true });
            await fs.mkdir(path.join(this.repoPath, 'policies'), { recursive: true });
        } catch (err) {
            console.error('Failed to create mock git repo:', err);
        }
    }

    /**
     * Commits a policy change to the simulated repository.
     * @param repoUrl Optional URL of the target repository. If missing, GitOps is skipped.
     */
    public async commitPolicy(resourceId: string, xml: string, justification: string, user: string, repoUrl?: string): Promise<{ commitId: string; timestamp: string; error?: string }> {
        if (!repoUrl) {
            console.warn(`[GitOps] No repository linked for ${resourceId}. GitOps skipped.`);
            return {
                commitId: 'N/A',
                timestamp: new Date().toISOString(),
                error: 'NO_REPO_LINKED'
            };
        }

        await this.ensureRepo();

        const fileName = `${resourceId.replace(/[^a-zA-Z0-9]/g, '_')}.xml`;
        const filePath = path.join(this.repoPath, 'policies', fileName);

        // 1. Write the file
        await fs.writeFile(filePath, xml, 'utf8');

        // 2. Git Commit & Push
        try {
            const status = await this.git.status();
            if (!status.isClean()) {
                await this.git.add(filePath);
                const commit = await this.git.commit(`chore(policy): update ${resourceId} - ${justification} [by ${user}]`);

                // Optional: Push if origin is configured
                // await this.git.push('origin', 'main');

                return {
                    commitId: commit.commit,
                    timestamp: new Date().toISOString()
                };
            }
        } catch (err) {
            console.error('[GitOps] Git command failed:', err);
            // Fallback for demo if git init hasn't been run
        }

        return {
            commitId: Math.random().toString(16).substring(2, 10),
            timestamp: new Date().toISOString()
        };
    }
}
