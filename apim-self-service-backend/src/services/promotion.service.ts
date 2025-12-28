/**
 * @fileoverview Promotion Service - Auto-Promotion Workflow
 * 
 * Handles automatic promotion after approval.
 * Flow: DEV → QA → STAGE (PROD requires manual flow)
 */

import { query } from './db.js';
import { deployProductToEnvironment } from './arm.service.js';

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
            SELECT display_name, description, api_path, policy_xml
            FROM products
            WHERE id = $1
        `, [productId]);

        if (productRes.rows.length === 0) {
            throw new Error(`Product ${productId} not found`);
        }

        const product = productRes.rows[0];

        // 2. Deploy to ARM/APIM
        console.log(`[Promotion] Deploying to ARM...`);
        const deployment = await deployProductToEnvironment(
            productId,
            targetEnvironment,
            {
                displayName: product.display_name,
                description: product.description,
                apiPath: product.api_path,
                policyXml: product.policy_xml
            }
        );

        if (!deployment.success) {
            throw new Error(deployment.error || 'ARM deployment failed');
        }

        console.log(`[Promotion] ARM deployment successful: ${deployment.deploymentId}`);

        // 3. Update product hash in database
        const hashColumn = `${targetEnvironment.toLowerCase()}_hash`;
        await query(`
            UPDATE products
            SET ${hashColumn} = $1,
                updated_at = NOW()
            WHERE id = $2
        `, [sourceHash, productId]);

        console.log(`[Promotion] Updated ${hashColumn} to ${sourceHash}`);

        // 4. Log SUCCESS to audit_log DATABASE TABLE (permanent record)
        await query(`
            INSERT INTO audit_log (
                entity_type, entity_id, action, user_id,
                changes, timestamp
            ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
            'product',
            productId,
            'auto_promotion',
            requesterId,
            JSON.stringify({
                targetEnvironment,
                sourceHash,
                deploymentId: deployment.deploymentId,
                approvalId
            })
        ]);

        console.log(`[Promotion] Logged to audit trail`);

        // 5. TODO: Send notification to requester
        // await sendNotification(requesterId, `Deployed to ${targetEnvironment}`);

        return {
            success: true,
            deploymentId: deployment.deploymentId
        };

    } catch (error: any) {
        console.error(`[Promotion] Failed:`, error);

        // Log FAILURE to audit_log DATABASE TABLE (permanent record)
        await query(`
            INSERT INTO audit_log (
                entity_type, entity_id, action, user_id,
                changes, timestamp
            ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
            'product',
            productId,
            'auto_promotion_failed',
            requesterId,
            JSON.stringify({
                targetEnvironment,
                error: error.message,
                approvalId
            })
        ]).catch(err => console.error('[Promotion] Failed to log error:', err));

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
    const result = await query(`
        SELECT * FROM audit_log
        WHERE entity_id = $1
        AND action IN ('auto_promotion', 'auto_promotion_failed', 'manual_promotion')
        ORDER BY timestamp DESC
        LIMIT 50
    `, [productId]);

    return result.rows.map(row => ({
        timestamp: row.timestamp,
        action: row.action,
        performedBy: row.user_id,
        details: row.changes,
        environment: row.changes?.targetEnvironment
    }));
}
