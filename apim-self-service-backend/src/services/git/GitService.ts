import fs from 'fs/promises';
import { mkdirSync, existsSync } from 'fs';
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
    private repoPath: string | null = null;
    private git: SimpleGit | null = null;
    private initialized: boolean = false;

    constructor() {
        // No longer calls getAppConfig() here to avoid module-load initialization errors
    }

    private async initialize() {
        if (this.initialized) return;

        const config = getAppConfig();
        // Points to the local clone path defined in config or defaults to a folder sibling to backend
        this.repoPath = config.gitLocalPath || path.resolve(process.cwd(), '../git-repo');

        // Explicit initialization: Ensure the directory exists before simple-git uses it
        // This prevents "Cannot use simple-git on a directory that does not exist" errors
        if (!existsSync(this.repoPath)) {
            console.log(`[GitService] Creating git repository directory: ${this.repoPath}`);
            mkdirSync(this.repoPath, { recursive: true });
        }

        // Prepare PAT if available (Twelve-Factor App)
        const pat = config.devops.pat;
        if (pat && pat !== 'your-read-only-pat') {
            console.log(`[GitService] Initializing with ADO PAT for organization: ${config.devops.organization}`);
        }

        this.git = simpleGit(this.repoPath);
        this.initialized = true;
    }

    private async ensureRepo() {
        await this.initialize();
        try {
            await fs.mkdir(this.repoPath!, { recursive: true });
            await fs.mkdir(path.join(this.repoPath!, 'policies'), { recursive: true });
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
        const filePath = path.join(this.repoPath!, 'policies', fileName);

        // 1. Write the file
        await fs.writeFile(filePath, xml, 'utf8');

        // 2. Git Commit & Push
        try {
            const status = await this.git!.status();
            if (!status.isClean()) {
                await this.git!.add(filePath);
                const commit = await this.git!.commit(`chore(policy): update ${resourceId} - ${justification} [by ${user}]`);

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

    /**
     * Fetches a policy XML from the repository.
     * @param resourceId The ID of the resource (API or Product)
     * @param repoUrl The Git repository URL
     * @param level The policy level (product, api, operation)
     */
    public async fetchPolicy(resourceId: string, repoUrl: string, level: string = 'api'): Promise<{ xml: string; filePath: string }> {
        await this.initialize();
        // In a real scenario, we would clone to a temp directory or reuse a cache
        // For the demo, we assume the repo is already managed in this.repoPath
        console.log(`[GitService] Fetching ${level} policy for ${resourceId} from ${repoUrl}`);

        const sanitizedId = resourceId.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${sanitizedId}.xml`;
        const subDir = level === 'product' ? 'products' : level === 'operation' ? 'operations' : 'apis';
        const filePath = path.join(this.repoPath!, 'policies', subDir, fileName);

        if (!existsSync(filePath)) {
            // Initial mock content if file doesn't exist in our demo "repo"
            const mockXml = `<policies>\n    <inbound>\n        <base />\n        <!-- ${level.toUpperCase()} Policy for ${resourceId} -->\n    </inbound>\n</policies>`;
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, mockXml, 'utf8');
            return { xml: mockXml, filePath };
        }

        const xml = await fs.readFile(filePath, 'utf8');
        return { xml, filePath };
    }
}
