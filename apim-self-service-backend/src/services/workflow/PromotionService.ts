import { query } from '../core/db.js';
import { auditService } from '../core/AuditService.js';
import { RepoService } from '../git/ado/RepoService.js';
import { ResourceDiscovery } from '../../utils/resourceDiscovery.js';


export interface PromotionResult {
    success: boolean;
    deploymentId?: string;
    error?: string;
}

/**
 * Auto-promote product after approval granted
 * 
 * Workflow:
 * 1. Deploy to ARM/APIM
 * 2. Update product hash in DB
 * 3. Log to audit trail
 * 4. Send notification
 */
export async function autoPromoteProduct(
    approvalId: string,
    productId: string,
    targetEnvironment: string,
    sourceHash: string,
    requesterId: string
): Promise<PromotionResult> {
    console.log(`[Promotion] Auto-promoting ${productId} to ${targetEnvironment}`);

    // Validate environment (DEV→QA→STAGE only, not PROD)
    if (targetEnvironment === 'PROD') {
        return {
            success: false,
            error: 'PROD requires manual promotion flow'
        };
    }

    if (!['QA', 'STAGE'].includes(targetEnvironment)) {
        return {
            success: false,
            error: `Invalid target environment: ${targetEnvironment}`
        };
    }

    try {
        // 1. Get product details for deployment
        const productRes = await query(`
            SELECT name, display_name, description, api_path, version, region, 
                   owner_team_id, type, visibility, authorized_teams,
                   terraform_pipeline_url, github_url, git_repo_url, git_file_path,
                   identity_client_id, last_deployed_commit_hash
            FROM products
            WHERE id = $1
        `, [productId]);

        if (productRes.rows.length === 0) {
            throw new Error(`Product ${productId} not found`);
        }

        const sp = productRes.rows[0];
        const targetId = `${sp.name}:${targetEnvironment}:${sp.region}`;

        // 1a. CRITICAL ENFORCEMENT: Verify Target Identity Link Exists
        // Based on the new manual selection workflow, a link MUST exist in the DB before promotion.
        const identityCheck = await query(`
            SELECT id, client_id FROM app_registrations 
            WHERE product_id = $1 AND environment = $2
        `, [targetId, targetEnvironment]);

        if (identityCheck.rows.length === 0) {
            throw new Error(`[Blocking] Target Identity not found for ${targetEnvironment}. Please select and link an App Registration in the Promotion Wizard before proceeding.`);
        }

        const resolvedIdentityClientId = identityCheck.rows[0].client_id;
        console.log(`[Promotion] Resolved Identity for ${targetEnvironment}: ${resolvedIdentityClientId}`);

        // 2. Prepare Policy (Smart Overlay Merge)
        // In real life we'd fetch from Blob Storage or APIM first
        const { getProductPolicy } = await import('../inventory/ProductsService.js');
        const { policyXml: sourceXml } = await getProductPolicy(productId);

        const { OverlayService } = await import('../policy/OverlayService.js');
        const overlayService = new OverlayService();
        const { finalXml } = await overlayService.mergePolicy(sourceXml, '');

        // 2b. Commit to Git (Primary Source of Truth)
        let finalHash = sourceHash;
        const repoService = new RepoService();
        const fileList = sp.git_repo_url ? await repoService.listRepoFiles(productId, sp.git_repo_url).catch(() => []) : [];
        const policyPath = ResourceDiscovery.resolveProductPolicyPath(fileList, sp.name, targetEnvironment)
            || ResourceDiscovery.getDefaultProductPolicyPath(sp.name);

        if (sp.git_repo_url) {
            console.log(`[Promotion] Committing merged policy to Git for ${targetEnvironment} at ${policyPath}...`);
            finalHash = await repoService.commitFiles(productId, sp.git_repo_url, [
                { path: policyPath, content: finalXml }
            ], `chore: Promote ${sp.name} to ${targetEnvironment} (Approval: ${approvalId})`);
            console.log(`[Promotion] Produced Git Hash: ${finalHash}`);
        }

        // 2c. Direct APIM updates are DISALLOWED per architectural principles. 
        // The Saga will reconcile APIM based on the Git commit produced above.
        console.log(`[Promotion] Desired state committed to Git: ${finalHash}. Awaiting Saga reconciliation.`);

        // 2d. Store policy in blob storage (Persistence for portal view/history)
        const { getBlobStorage } = await import('../storage/BlobStorageService.js');
        const storage = getBlobStorage();
        await storage.upload(Buffer.from(finalXml), policyPath, requesterId);

        // 3. Upsert target environment row in database


        await query(`
            INSERT INTO products (
                id, name, display_name, version, description, state, owner_team_id, 
                environment, region, type, visibility, authorized_teams, 
                management_mode, pipeline_url, 
                git_repo_url, identity_client_id, 
                last_deployed_commit_hash, last_deployed_at,
                updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, 
                $8, $9, $10, $11, $12, 
                $13, $14, $15, $16,
                $17, NOW(),
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                description = EXCLUDED.description,
                state = EXCLUDED.state,
                owner_team_id = EXCLUDED.owner_team_id,
                pipeline_url = EXCLUDED.pipeline_url,
                git_repo_url = EXCLUDED.git_repo_url,
                last_deployed_commit_hash = EXCLUDED.last_deployed_commit_hash,
                last_deployed_at = EXCLUDED.last_deployed_at,
                updated_at = NOW()
        `, [
            targetId, sp.name, sp.display_name, sp.version, sp.description, 'published', sp.owner_team_id,
            targetEnvironment, sp.region, sp.type, sp.visibility, sp.authorized_teams,
            'TERRAFORM_MANAGED', sp.pipeline_url || sp.terraform_pipeline_url,
            sp.git_repo_url, resolvedIdentityClientId,
            finalHash
        ]);

        console.log(`[Promotion] Upserted target environment row: ${targetId} with hash ${finalHash}`);

        // 4. Log SUCCESS to audit_log using AuditService
        await auditService.log({
            resourceType: 'product',
            resourceId: productId,
            action: 'PROMOTE',
            userId: requesterId,
            userEmail: 'system@portal.local',
            userRole: 'system',
            details: {
                targetEnvironment,
                sourceHash,
                finalHash,
                approvalId,
                status: 'success'
            }
        });

        console.log(`[Promotion] Logged to audit trail`);

        return {
            success: true
        };


    } catch (error: any) {
        console.error(`[Promotion] Failed:`, error);

        // Log FAILURE to audit_log
        await auditService.log({
            resourceType: 'product',
            resourceId: productId,
            action: 'PROMOTE',
            userId: requesterId,
            userEmail: 'system@portal.local',
            userRole: 'system',
            details: {
                targetEnvironment,
                error: error.message,
                approvalId,
                status: 'failed'
            }
        }).catch(err => console.error('[Promotion] Failed to log error:', err));

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Direct promotion of product (bypassing approval flow if needed)
 */
export async function promoteProduct(
    productId: string,
    targetEnvironment: string,
    requesterId: string,
    _policyXml?: string,
    _variables?: any
): Promise<PromotionResult> {
    console.log(`[Promotion] Manual promotion of ${productId} to ${targetEnvironment} by ${requesterId}`);

    try {
        // 1. Get product details for promotion
        const productRes = await query(`
            SELECT * FROM products WHERE id = $1
        `, [productId]);

        if (productRes.rows.length === 0) {
            throw new Error(`Product ${productId} not found`);
        }

        const sp = productRes.rows[0];
        const targetId = `${sp.name}:${targetEnvironment}:${sp.region}`;

        // 1a. CRITICAL ENFORCEMENT: Verify Target Identity Link Exists
        const identityCheck = await query(`
            SELECT id, client_id FROM app_registrations 
            WHERE product_id = $1 AND environment = $2
        `, [targetId, targetEnvironment]);

        if (identityCheck.rows.length === 0) {
            throw new Error(`[Blocking] Target Identity not found for ${targetEnvironment}. Please LINK an App Registration first.`);
        }

        const resolvedIdentityClientId = identityCheck.rows[0].client_id;
        console.log(`[Promotion] Resolved Identity for ${targetEnvironment}: ${resolvedIdentityClientId}`);

        // 2. Prepare content for target environment
        const { getProductPolicy } = await import('../inventory/ProductsService.js');
        const { policyXml } = await getProductPolicy(productId);

        let finalHash = sp.last_deployed_commit_hash || 'manual-hash';

        // 3. Commit to Git (Primary Source of Truth)
        const repoService = new RepoService();
        const fileList = sp.git_repo_url ? await repoService.listRepoFiles(productId, sp.git_repo_url).catch(() => []) : [];
        const policyPath = ResourceDiscovery.resolveProductPolicyPath(fileList, sp.name, targetEnvironment)
            || ResourceDiscovery.getDefaultProductPolicyPath(sp.name);

        if (sp.git_repo_url) {
            console.log(`[Promotion] Committing manual promotion to Git for ${targetEnvironment} at ${policyPath}...`);
            finalHash = await repoService.commitFiles(productId, sp.git_repo_url, [
                { path: policyPath, content: policyXml }
            ], `chore: Manual promote ${sp.name} to ${targetEnvironment} by ${requesterId}`);
            console.log(`[Promotion] Produced Git Hash: ${finalHash}`);
        }

        // 4. Upsert target environment row in database
        await query(`
            INSERT INTO products (
                id, name, display_name, version, description, state, owner_team_id, 
                environment, region, type, visibility, authorized_teams, 
                management_mode, terraform_pipeline_url, github_url, 
                git_repo_url, git_file_path, identity_client_id, 
                last_deployed_commit_hash, last_deployed_at,
                updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, 
                $8, $9, $10, $11, $12, 
                $13, $14, $15, 
                $16, $17, $18, 
                $19, NOW(),
                NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                display_name = EXCLUDED.display_name,
                description = EXCLUDED.description,
                state = EXCLUDED.state,
                owner_team_id = EXCLUDED.owner_team_id,
                last_deployed_commit_hash = EXCLUDED.last_deployed_commit_hash,
                last_deployed_at = EXCLUDED.last_deployed_at,
                updated_at = NOW()
        `, [
            targetId, sp.name, sp.display_name, sp.version, sp.description, 'published', sp.owner_team_id,
            targetEnvironment, sp.region, sp.type, sp.visibility, sp.authorized_teams,
            'TERRAFORM_MANAGED', sp.terraform_pipeline_url, sp.github_url,
            sp.git_repo_url, sp.git_file_path, resolvedIdentityClientId,
            finalHash
        ]);

        console.log(`[Promotion] Manual upsert target row: ${targetId}`);

        // 5. Log to audit trail
        await auditService.log({
            resourceType: 'product',
            resourceId: productId,
            action: 'PROMOTE',
            userId: requesterId,
            userEmail: 'system@portal.local',
            userRole: 'system',
            details: {
                targetEnvironment,
                finalHash,
                method: 'manual',
                status: 'success'
            }
        });

        return {
            success: true
        };
    } catch (error: any) {
        console.error(`[Promotion] Manual promotion failed:`, error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get promotion history for a product
 */
export async function getPromotionHistory(productId: string) {
    // AuditService query
    return await auditService.queryLogs({
        resourceId: productId,
        action: 'PROMOTE',
        limit: 50
    });
}
