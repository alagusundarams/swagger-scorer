import { logAudit } from '../../core/AuditService.js';
import { GitService } from '../../git/GitService.js';
import { getAppConfig } from '../../../config/loader.js';

interface SagaContext {
    resourceType: 'product' | 'api' | 'named_value' | 'backend';
    resourceId: string;
    resourceName: string;
    payload: any;
    user: { id: string, email: string, name: string };
    environment: string;
}

export class CreateSagaOrchestrator {
    private gitService: GitService | undefined;
    private repoUrl: string;

    constructor() {
        // this.gitService = new GitService(); // Removed to prevent early config access
        this.repoUrl = process.env.GIT_REPO_URL || 'https://github.com/myorg/apim-policy-repo.git';
    }

    private getGitService(): GitService {
        if (!this.gitService) {
            this.gitService = new GitService();
        }
        return this.gitService;
    }

    /**
     * Executes the Create Saga
     */
    public async executeCreate(context: SagaContext) {
        console.log(`[CreateSaga] Starting creation for ${context.resourceType}/${context.resourceName}`);

        try {
            // PHASE 1: Validation (Dependencies)
            await this.validateDependencies(context);

            // PHASE 2: Database Provisional (State: CREATING)
            // Note: Actual DB implementation depends on if we insert BEFORE or AFTER apim in legacy code.
            // Here we assume we mark it as "creating" or rely on the fact it's not "ACTIVE" yet.
            // For now, we assume the caller inserts the initial record, or we do it here. 
            // In typical saga, we'd insert here. Let's assume the SERVICE called us.

            // PHASE 3: APIM Provisioning
            const apimResult = await this.provisionInApim(context);
            if (!apimResult.success) {
                throw new Error(`APIM Provisioning Failed: ${apimResult.error}`);
            }

            // PHASE 4: Git Backup
            const gitResult = await this.backupToGit(context);

            // PHASE 5: Finalize (Update DB with Etag/Hash)
            await this.finalizeResource(context, apimResult, gitResult);

            // AUDIT
            await logAudit({
                resourceType: context.resourceType,
                resourceId: context.resourceId,
                action: 'CREATE_SAGA_COMPLETE',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: 'system', // or derived from context
                details: {
                    gitBranch: gitResult.branch,
                    apimEtag: apimResult.etag
                }
            });

            return { success: true, id: context.resourceId };

        } catch (error: any) {
            console.error('[CreateSaga] FAILED:', error);
            await this.rollback(context, error.message);
            throw error;
        }
    }

    private async validateDependencies(context: SagaContext) {
        // Example: If creating API, check if Product exists
        if (context.resourceType === 'api') {
            const productId = context.payload.productId;
            // Mock check: In real app, query DB
            if (!productId) throw new Error('API creation requires Product ID');
        }
        // Example: Scan for {{NamedValues}} in XML if present
        if (context.payload.policyXml) {
            // TODO: Regex scan and check DB
        }
    }

    private async provisionInApim(context: SagaContext) {
        const config = getAppConfig();
        const isMock = config.useBackendMocks;
        const { createProduct, createApi, createNamedValue, createBackend } = isMock
            ? await import('../../apim/ApimService.mock.js')
            : await import('../../apim/ApimService.js');

        try {
            let result;
            switch (context.resourceType) {
                case 'product':
                    // Map generic payload to specific APIM args
                    result = await createProduct(context.payload.name, context.payload, context.environment);
                    break;
                case 'api':
                    result = await createApi(context.payload.productId, context.payload, context.environment);
                    break;
                case 'named_value':
                    result = await createNamedValue(context.payload.productId, context.payload, context.environment);
                    break;
                case 'backend':
                    result = await createBackend(context.payload, context.environment);
                    break;
                default:
                    throw new Error(`Unsupported resource type: ${context.resourceType}`);
            }

            // Verify Response (Simulated)
            // Real ARM response has properties.provisioningState
            // For now, assume service throws on error, or returns object.
            return {
                success: true,
                etag: result?.etag || 'W/"simulation-etag"', // Mock Etag if missing
                data: result
            };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
    }

    private async backupToGit(context: SagaContext) {
        // Determine Path
        let filePath = '';
        let content = '';

        switch (context.resourceType) {
            case 'product':
                filePath = `policies/products/${context.resourceName}.xml`;
                content = context.payload.policyXml || '<policies><inbound/></policies>';
                break;
            case 'api':
                filePath = `policies/apis/${context.resourceName}.xml`;
                content = context.payload.policyXml || '<policies><inbound/></policies>';
                break;
            case 'named_value':
                filePath = `config/${context.environment}/named-values.json`;
                // Logic to read existing, append, write back would be here. 
                // For simplified POC, we assume single file per value or just skipping for now?
                // Plan said "Atomic". Writing one file per Value is cleaner for Git:
                filePath = `config/${context.environment}/named-values/${context.resourceName}.json`;
                content = JSON.stringify(context.payload, null, 2);
                break;
            case 'backend':
                filePath = `config/${context.environment}/backends/${context.resourceName}.json`;
                content = JSON.stringify(context.payload, null, 2);
                break;
        }

        return await this.getGitService().commitResource(
            this.repoUrl,
            filePath,
            content,
            context.resourceId,
            context.resourceType,
            `feat: create ${context.resourceType} ${context.resourceName}`,
            { name: context.user.name || 'APIM Bot', email: context.user.email || 'bot@apim.com' }
        );
    }

    private async finalizeResource(context: SagaContext, apimResult: any, gitResult: any) {
        // UPDATE DB with Etag and Git info
        // This requires dynamic Repo updates. 
        // For POC, we'll log it. In real implementation, call productsService.updateMetadata(id, apimData, gitData)
        console.log(`[CreateSaga] Finalizing ${context.resourceId}. Etag: ${apimResult.etag}, Git: ${gitResult.hash}`);

        // TODO: Call DB update to set apim_raw_data = { etag: ... }
    }

    private async rollback(context: SagaContext, reason: string) {
        console.warn(`[CreateSaga] Rolling back ${context.resourceId} due to: ${reason}`);
        // 1. Delete from APIM (if it was created)
        // 2. Delete from DB (Hard delete since it was never active)

        await logAudit({
            resourceType: context.resourceType,
            resourceId: context.resourceId,
            action: 'CREATE_SAGA_ROLLBACK',
            userId: context.user.id,
            userEmail: context.user.email,
            userRole: 'system',
            details: { reason }
        });
    }
}
