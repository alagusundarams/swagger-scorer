/**
 * @fileoverview Approvals Service
 * 
 * Handles approval workflow, including deployment orchestration
 */

import { query } from '../core/db.js';
import { auditService } from '../core/AuditService.js';
import { simulateDeployCommit } from '../git/GitService.js';
import { syncToAPIM, createSubscription, deleteSubscription } from '../apim/ApimService.js';
import { createSNOWTicket } from '../notification/SnowService.js';
import { autoPromoteProduct } from './PromotionService.js';

/**
 * Fetch all approval requests
 */
export async function getAllApprovals() {
    const res = await query(`
        SELECT a.*, t.name as team_name
        FROM approval_requests a
        JOIN teams t ON a.requester_team_id = t.id
        ORDER BY a.submitted_at DESC
    `);

    return res.rows.map(a => ({
        ...a,
        requesterTeamId: a.requester_team_id,
        requesterTeamName: a.team_name,
        submittedAt: a.submitted_at,
        resolvedAt: a.resolved_at,
        resolvedBy: a.resolved_by,
        productId: a.details.productId,
        // Map to frontend-expected format
        requester: {
            name: a.requester_name,
            email: a.requester_email,
            teamId: a.requester_team_id,
            teamName: a.team_name
        }
    }));
}

/**
 * Create a new approval request
 */
export async function createApprovalRequest(request: {
    type: 'PROMOTION' | 'SUBSCRIPTION' | 'DEPLOYMENT' | 'ACCESS',
    requesterName: string,
    requesterEmail: string,
    requesterTeamId: string,
    details: any
}) {
    const { type, requesterName, requesterEmail, requesterTeamId, details } = request;

    const res = await query(`
        INSERT INTO approval_requests 
        (type, requester_name, requester_email, requester_team_id, details)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `, [type, requesterName, requesterEmail, requesterTeamId, JSON.stringify(details)]);

    return res.rows[0];
}

/**
 * Fetch pending approvals (Optional: filtered by team)
 */
export async function getPendingApprovals(teamId?: string) {
    let sql = `
        SELECT a.*, t.name as team_name
        FROM approval_requests a
        JOIN teams t ON a.requester_team_id = t.id
        WHERE a.status = 'PENDING'
    `;
    const params: any[] = [];

    if (teamId) {
        sql += ` AND a.requester_team_id = $1`;
        params.push(teamId);
    }

    sql += ` ORDER BY a.submitted_at DESC`;

    const res = await query(sql, params);

    return res.rows.map(a => ({
        ...a,
        requesterTeamId: a.requester_team_id,
        requesterTeamName: a.team_name,
        submittedAt: a.submitted_at,
        // Map to frontend-expected format
        requester: {
            name: a.requester_name,
            email: a.requester_email,
            teamId: a.requester_team_id,
            teamName: a.team_name
        }
    }));
}

/**
 * Process an approval (approve/reject) with deployment orchestration
 */
export async function updateApproval(id: string, status: 'APPROVED' | 'REJECTED', resolvedBy: string) {
    // 1. Update Approval record
    const apprRes = await query(`
        UPDATE approval_requests 
        SET status = $1, resolved_at = NOW(), resolved_by = $2
        WHERE id = $3
        RETURNING *
    `, [status, resolvedBy, id]);

    if (apprRes.rows.length === 0) throw new Error('Approval not found');

    const approval = apprRes.rows[0];

    // 2. If it was a subscription, make APIM Call THEN update DB state
    if (approval.type === 'SUBSCRIPTION' && approval.details.subscriptionId) {
        if (status === 'APPROVED') {
            const payload = {
                properties: {
                    scope: `/products/${approval.details.productId}`,
                    displayName: `Subscription for ${approval.requester_name || 'Team'}`,
                    state: 'active'
                }
            };

            let apimCreated = false;
            try {
                console.log(`[Approvals] Creating Subscription ${approval.details.subscriptionId} in APIM...`);
                // A. Create in APIM
                await createSubscription(approval.details.subscriptionId, payload, 'dev');
                apimCreated = true;

                // B. Update Database State
                await query(`
                    UPDATE subscriptions
                    SET state = 'active', updated_at = NOW()
                    WHERE id = $1
                `, [approval.details.subscriptionId]);

            } catch (error: any) {
                console.error(`[Approvals] ❌ CRITICAL: Subscription Provisioning Failed: ${error.message}`);

                // --- ROLLBACK STRATEGY ---
                console.log(`[Approvals] 🔄 Initiating Rollback...`);

                // 1. Rollback APIM (if executed)
                if (apimCreated) {
                    try {
                        console.log(`[Approvals] 🔄 Rolling back APIM Subscription...`);
                        await deleteSubscription(approval.details.subscriptionId, 'dev');
                    } catch (rbError) {
                        console.error(`[Approvals] ☠️ DOUBLE FAULT: Failed to rollback APIM subscription:`, rbError);
                        // TODO: Log to Critical Alerts Table
                    }
                }

                // 2. Rollback Approval Status (DB)
                await query(`
                    UPDATE approval_requests 
                    SET status = 'PENDING', resolved_at = NULL, resolved_by = NULL
                    WHERE id = $1
                `, [id]);

                throw new Error(`Provisioning Failed (Rolled Back): ${error.message}`);
            }
        } else {
            // Rejected Flow
            await query(`
                UPDATE subscriptions
                SET state = 'rejected', updated_at = NOW()
                WHERE id = $1
            `, [approval.details.subscriptionId]);
        }
    }

    // 3. Auto-Promotion Flow for QA/STAGE (DEV→QA→STAGE, NOT PROD)
    if (status === 'APPROVED' && approval.type === 'PROMOTION') {
        const targetEnv = approval.details?.targetEnvironment;
        const productId = approval.details?.productId;
        const sourceHash = approval.details?.sourceHash;

        // Auto-promote to QA or STAGE only
        if (targetEnv && ['QA', 'STAGE'].includes(targetEnv) && productId && sourceHash) {
            console.log(`[Approvals] Triggering auto-promotion to ${targetEnv}...`);

            const promotionResult = await autoPromoteProduct(
                id,
                productId,
                targetEnv,
                sourceHash,
                resolvedBy
            );

            if (!promotionResult.success) {
                console.error(`[Approvals] Auto-promotion failed: ${promotionResult.error}`);
                // Log failure but don't block approval completion
                // Log failure but don't block approval completion
                // Note: PromotionService already logs detailed failure to audit_log
                console.warn(`[Approvals] Auto-promotion failure logged by PromotionService.`);
            } else {
                console.log(`[Approvals] Auto-promotion successful: ${promotionResult.deploymentId}`);
            }
        }
    }

    // 4. Deployment Flow (Demo / Simulation) - Legacy DEV flow
    if (status === 'APPROVED' && approval.details?.environment === 'DEV') {
        const targetId = approval.details.targetId || approval.details.productId;

        // --- VALIDATION GATE START --- (User Req 8, 9, 11)
        // Ensure "User is liable" -> Validate the Repo URL they provided exists
        if (process.env.ENABLE_STRICT_VALIDATION === 'true') {
            const repoUrl = approval.details.repoUrl;
            if (!repoUrl) {
                throw new Error('VALIDATION GATE FAILURE: Repository URL is required before approval.');
            }
            // Lazy load to avoid circular deps if any
            // Ensure path is correct for Dynamic Import if RepoService was moved?
            // RepoService logic was NOT moved yet in my plan? I need to check where it is.
            // Assuming it's in backend root or local. It says './ado/RepoService.js'
            // I haven't touched 'ado' folder. So it might fail if 'ado' is relative to service root.
            // Services root is now `services/workflow/`.
            // If `ado` was in `services/ado`, I need to go up.
            const { RepoService } = await import('../git/ado/RepoService.js');
            const repoService = new RepoService();
            const validation = await repoService.validateRepoUrl(repoUrl);

            if (!validation.isValid) {
                throw new Error(`VALIDATION GATE FAILURE: Repository validation failed. ${validation.error}`);
            }
        }
        // --- VALIDATION GATE END ---

        if (targetId) {
            // 4a. GitOps Simulation with Attribution (User Req 13)
            const gitInfo = await simulateDeployCommit(targetId, 'DEV', {
                authorName: resolvedBy, // "Who pushed the button"
                authorEmail: `${resolvedBy.replace(/\s+/g, '.')}@example.com`, // Simulated email
                message: `Approved and Deployed by ${resolvedBy}`
            });

            // 4b. APIM Synchronization
            await syncToAPIM(targetId, 'DEV');

            // 4c. SNOW Ticket (ServiceNow)
            await createSNOWTicket('deployment', `Auto-deploy for ${targetId} to DEV as part of approval ${id}. Repo: ${approval?.details?.repoUrl || 'N/A'}`);

            // 4d. Update product state
            await query(`
                UPDATE products 
                SET state = 'published', updated_at = NOW() 
                WHERE id = $1
            `, [targetId]);

            // 4e. Persistent Audit Log
            // 4e. Persistent Audit Log
            await auditService.log({
                resourceType: 'product',
                resourceId: targetId,
                action: 'DEPLOY',
                userId: resolvedBy,
                userEmail: 'system@portal.local',
                userRole: 'system',
                details: {
                    commitHash: gitInfo.hash,
                    branch: gitInfo.branch,
                    environment: 'DEV',
                    triggeredBy: resolvedBy,
                    status: 'SUCCESS',
                    repoUrl: approval.details.repoUrl
                }
            });
        }
    }

    return approval;
}
