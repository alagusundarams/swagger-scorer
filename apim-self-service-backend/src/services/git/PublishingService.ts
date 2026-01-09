import fs from 'fs/promises';
import path from 'path';
import { getAppConfig } from '../../config/loader.js';
import { GitService } from './GitService.js';
import { ResourcePaths } from '../../utils/resourcePaths.js';
import pino from 'pino';

const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

/**
 * PublishingService
 * 
 * Handles the synchronization of API artifacts to Git repositories (GitOps).
 * Follows the organization's folder structure conventions defined in ResourcePaths.
 */
export class PublishingService {
    private _gitService: GitService | null = null;

    constructor() {
        // Dependencies are initialized lazily to avoid module-load configuration errors
    }

    /**
     * Lazy initialization of GitService
     */
    private get gitService(): GitService {
        if (!this._gitService) {
            const config = getAppConfig();
            this._gitService = new GitService({ gitLocalPath: config.gitLocalPath });
        }
        return this._gitService;
    }

    /**
     * Publishes API artifacts to a Git repository following ResourcePaths conventions.
     * 
     * @param productId - The ID of the product
     * @param apiId - The ID of the API
     * @param specContent - The OpenAPI specification content
     * @param repoUrl - The URL of the destination Git repository
     * @param user - User metadata for the commit
     * @param policyXml - (Optional) The API policy XML content
     */
    async publishToGit(
        productId: string,
        apiId: string,
        specContent: string,
        repoUrl: string,
        user: { name: string; email: string },
        policyXml?: string
    ): Promise<{ success: boolean; branch?: string; hash?: string; error?: string }> {
        try {
            logger.info(`[PublishingService] Initiating GitOps publish for API ${apiId} in Product ${productId}`);

            const extension = specContent.trim().startsWith('{') ? 'json' : 'yaml';

            // 1. Determine paths following conventions
            const contractPath = ResourcePaths.apiContract(productId, apiId, extension);
            const policyPath = ResourcePaths.apiPolicyBase(productId, apiId);

            const commitMessage = `onboard(api): initialize ${apiId} contract and policy`;

            // We use a temporary branch for the onboarding pull request
            const branchName = `onboard/${apiId.toLowerCase()}-${Date.now()}`;

            // Initialize repo
            await this.gitService.initializeRepo(repoUrl);

            // Checkout and prepare
            await (this.gitService as any).git.checkout('main'); // Ensure base
            await (this.gitService as any).git.pull();
            await (this.gitService as any).git.checkoutLocalBranch(branchName);

            const repoPath = (this.gitService as any).localRepoPath;

            // Write Contract
            const fullContractPath = path.join(repoPath, contractPath);
            await fs.mkdir(path.dirname(fullContractPath), { recursive: true });
            await fs.writeFile(fullContractPath, specContent, 'utf-8');

            // Write Policy
            if (policyXml) {
                const fullPolicyPath = path.join(repoPath, policyPath);
                await fs.mkdir(path.dirname(fullPolicyPath), { recursive: true });
                await fs.writeFile(fullPolicyPath, policyXml, 'utf-8');
            }

            // Add, Commit, Push
            await (this.gitService as any).git.addConfig('user.name', user.name);
            await (this.gitService as any).git.addConfig('user.email', user.email);
            await (this.gitService as any).git.add('.');
            const commitResult = await (this.gitService as any).git.commit(commitMessage);
            await (this.gitService as any).git.push('origin', branchName);

            logger.info(`[PublishingService] Successfully pushed ${apiId} to ${branchName} (${commitResult.commit})`);

            return {
                success: true,
                branch: branchName,
                hash: commitResult.commit
            };

        } catch (error: any) {
            logger.error(`[PublishingService] GitOps publish failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export const publishingService = new PublishingService();
