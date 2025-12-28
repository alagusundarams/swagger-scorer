/**
 * @fileoverview Approvals Service
 * 
 * Handles approval workflow, including deployment orchestration
 */

import { query } from './db.js';
import { logAudit } from './audit.service.js';
import { simulateDeployCommit } from './git.service.js';
import { syncToAPIM } from './apim.service.js';
import { createSNOWTicket } from './snow.service.js';
import { autoPromoteProduct } from './promotion.service.js';

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

    // 2. If it was a subscription, update the subscription state
    if (approval.type === 'SUBSCRIPTION' && approval.details.subscriptionId) {
        const subState = status === 'APPROVED' ? 'active' : 'rejected';
        await query(`
            UPDATE subscriptions
            SET state = $1, updated_at = NOW()
            WHERE id = $2
        `, [subState, approval.details.subscriptionId]);
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
                await logAudit({
                    entityType: 'product',
                    entityId: productId,
                    action: 'auto_promotion_failed',
                    userId: resolvedBy,
                    changes: {
                        targetEnvironment: targetEnv,
                        error: promotionResult.error
                    }
                });
            } else {
                console.log(`[Approvals] Auto-promotion successful: ${promotionResult.deploymentId}`);
            }
        }
    }

    // 4. Deployment Flow (Demo / Simulation) - Legacy DEV flow
    if (status === 'APPROVED' && approval.details?.environment === 'DEV') {
        const targetId = approval.details.targetId || approval.details.productId;
        if (targetId) {
            // 4a. GitOps Simulation
            const gitInfo = await simulateDeployCommit(targetId, 'DEV');

            // 4b. APIM Synchronization
            await syncToAPIM(targetId, 'DEV');

            // 4c. SNOW Ticket (ServiceNow)
            await createSNOWTicket('deployment', `Auto-deploy for ${targetId} to DEV as part of approval ${id}`);

            // 4d. Update product state
            await query(`
                UPDATE products 
                SET state = 'published', updated_at = NOW() 
                WHERE id = $1
            `, [targetId]);

            // 4e. Persistent Audit Log
            await logAudit({
                entityType: 'product',
                entityId: targetId,
                action: 'deployed',
                userId: 'admin-001',
                changes: {
                    commitHash: gitInfo.hash,
                    branch: gitInfo.branch,
                    environment: 'DEV',
                    triggeredBy: resolvedBy,
                    status: 'SUCCESS'
                }
            });
        }
    }

    return approval;
}
