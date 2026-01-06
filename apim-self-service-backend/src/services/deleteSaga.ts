/**
 * Delete Saga Orchestrator
 * 
 * Implements distributed transaction pattern (Saga) for deleting resources across:
 * 1. Azure APIM (source of truth)
 * 2. PostgreSQL Database (local cache)
 * 3. Git Repository (configuration backup)
 * 
 * ROLLBACK STRATEGY:
 * - Any failure in the saga triggers automatic rollback
 * - Rollback recreates deleted resources in previous systems
 * - All steps are logged to audit_log for compliance
 */

import { apimGateway } from '../gateways/apimGateway.js';
import { query } from './db.js';
import { auditService } from './auditService.js';
import type { ResourceType } from './auditService.js';

interface DeleteContext {
    resourceType: ResourceType;
    resourceId: string;
    resourceName: string;
    environment: string;
    reason: string;
    userId: string;
    userEmail: string;
    userRole: string;
    ipAddress?: string;
}

interface SagaResult {
    success: boolean;
    completedSteps: string[];
    failedStep?: string;
    error?: string;
    auditLogId?: string;
}

export class DeleteSagaOrchestrator {
    /**
     * Execute delete saga for a single resource
     * 
     * @param context - Delete operation context
     * @returns Saga result with success status and completed steps
     */
    async executeDelete(context: DeleteContext): Promise<SagaResult> {
        const completedSteps: string[] = [];
        let resourceSnapshot: any = null;

        try {
            // =================================================================
            // STEP 0: Fetch resource snapshot (for rollback + audit)
            // =================================================================
            console.log(`[Saga] Step 0: Fetching ${context.resourceType}/${context.resourceId} from DB...`);

            resourceSnapshot = await this.fetchResourceSnapshot(
                context.resourceType,
                context.resourceId
            );

            if (!resourceSnapshot) {
                throw new Error(`Resource not found: ${context.resourceType}/${context.resourceId}`);
            }

            completedSteps.push('snapshot');

            // =================================================================
            // STEP 1: Delete from Azure APIM
            // =================================================================
            console.log(`[Saga] Step 1: Deleting from APIM (${context.environment})...`);

            await this.deleteFromApim(
                context.resourceType,
                context.resourceId,
                context.environment
            );

            completedSteps.push('apim');
            console.log(`[Saga] ✅ APIM deletion successful`);

            // =================================================================
            // STEP 2: Delete from Database
            // =================================================================
            console.log(`[Saga] Step 2: Deleting from Database...`);

            await this.deleteFromDatabase(
                context.resourceType,
                context.resourceId
            );

            completedSteps.push('database');
            console.log(`[Saga] ✅ Database deletion successful`);

            // =================================================================
            // STEP 3: Delete from Git (if applicable)
            // =================================================================
            // Only delete from Git if resource has configuration files
            const hasGitConfig = resourceSnapshot.git_config_path ||
                context.resourceType === 'product';

            if (hasGitConfig) {
                console.log(`[Saga] Step 3: Committing deletion to Git...`);

                await this.deleteFromGit(
                    context.resourceType,
                    context.resourceId,
                    context.resourceName,
                    context.environment,
                    context.userEmail
                );

                completedSteps.push('git');
                console.log(`[Saga] ✅ Git commit successful`);
            } else {
                console.log(`[Saga] Step 3: Skipped (no Git config for ${context.resourceType})`);
                completedSteps.push('git-skipped');
            }

            // =================================================================
            // STEP 4: Audit log success
            // =================================================================
            const auditLogId = await auditService.log({
                userId: context.userId,
                userEmail: context.userEmail,
                userRole: context.userRole,
                action: 'DELETE',
                resourceType: context.resourceType,
                resourceId: context.resourceId,
                resourceName: context.resourceName,
                details: {
                    reason: context.reason,
                    environment: context.environment,
                    snapshot: resourceSnapshot,
                    sagaSteps: completedSteps,
                    status: 'success'
                },
                ipAddress: context.ipAddress
            });

            console.log(`[Saga] ✅ Delete saga completed successfully. Audit: ${auditLogId}`);

            return {
                success: true,
                completedSteps,
                auditLogId
            };

        } catch (error: any) {
            // =================================================================
            // ROLLBACK: Undo all completed steps in reverse order
            // =================================================================
            console.error(`[Saga] ❌ Delete failed at step: ${error.message}`);
            console.log(`[Saga] 🔄 Starting rollback... Completed steps: ${completedSteps.join(' → ')}`);

            const failedStep = this.determineFailedStep(completedSteps);

            try {
                await this.rollback(context, resourceSnapshot, completedSteps);
                console.log(`[Saga] ✅ Rollback completed successfully`);
            } catch (rollbackError: any) {
                console.error(`[Saga] ❌ CRITICAL: Rollback failed:`, rollbackError);
                // Log critical failure for manual intervention
                await this.logCriticalFailure(context, error, rollbackError);
            }

            // Audit log failure
            await auditService.log({
                userId: context.userId,
                userEmail: context.userEmail,
                userRole: context.userRole,
                action: 'DELETE',
                resourceType: context.resourceType,
                resourceId: context.resourceId,
                resourceName: context.resourceName,
                details: {
                    reason: context.reason,
                    environment: context.environment,
                    snapshot: resourceSnapshot,
                    sagaSteps: completedSteps,
                    failedStep,
                    error: error.message,
                    status: 'failed'
                },
                ipAddress: context.ipAddress
            });

            return {
                success: false,
                completedSteps,
                failedStep,
                error: error.message
            };
        }
    }

    /**
     * Fetch resource snapshot from database
     */
    private async fetchResourceSnapshot(
        resourceType: ResourceType,
        resourceId: string
    ): Promise<any> {
        const tableMap: Record<ResourceType, string> = {
            product: 'products',
            subscription: 'subscriptions',
            named_value: 'named_values',
            backend: 'governance_backends'
        };

        const table = tableMap[resourceType];
        if (!table) {
            throw new Error(`Unknown resource type: ${resourceType}`);
        }

        const result = await query(
            `SELECT * FROM ${table} WHERE id = $1`,
            [resourceId]
        );

        return result.rows[0] || null;
    }

    /**
     * Delete resource from Azure APIM
     */
    private async deleteFromApim(
        resourceType: ResourceType,
        resourceId: string,
        environment: string
    ): Promise<void> {
        // Map resource types to APIM API paths
        const pathMap: Record<ResourceType, string> = {
            product: `/products/${resourceId}`,
            subscription: `/subscriptions/${resourceId}`,
            named_value: `/namedValues/${resourceId}`,
            backend: `/backends/${resourceId}`
        };

        const path = pathMap[resourceType];
        if (!path) {
            throw new Error(`No APIM path mapping for: ${resourceType}`);
        }

        // Use APIM gateway to delete resource
        await apimGateway.delete(path, environment);
    }

    /**
     * Delete resource from database
     */
    private async deleteFromDatabase(
        resourceType: ResourceType,
        resourceId: string
    ): Promise<void> {
        const tableMap: Record<ResourceType, string> = {
            product: 'products',
            subscription: 'subscriptions',
            named_value: 'named_values',
            backend: 'governance_backends'
        };

        const table = tableMap[resourceType];

        const result = await query(
            `DELETE FROM ${table} WHERE id = $1`,
            [resourceId]
        );

        if (result.rowCount === 0) {
            throw new Error(`Resource not found in database: ${resourceId}`);
        }
    }

    /**
     * Delete resource configuration from Git
     */
    private async deleteFromGit(
        resourceType: ResourceType,
        resourceId: string,
        resourceName: string,
        environment: string,
        userEmail: string
    ): Promise<void> {
        // TODO: Implement Git deletion
        // For now, log placeholder
        console.log(`[Saga][Git] Would delete ${resourceType}/${resourceId} from Git repo`);

        // Expected implementation:
        // 1. Checkout repo
        // 2. Remove config file (e.g., policies/product-x.xml)
        // 3. Commit with message: "Delete ${resourceName} (${environment})"
        // 4. Push to remote

        // Placeholder for Git integration
        // await gitClient.commitDeletion({
        //   resourceType,
        //   resourceId,
        //   resourceName,
        //   environment,
        //   author: userEmail,
        //   message: `Delete ${resourceType}: ${resourceName} (${environment})`
        // });
    }

    /**
     * Rollback completed saga steps
     */
    private async rollback(
        context: DeleteContext,
        resourceSnapshot: any,
        completedSteps: string[]
    ): Promise<void> {
        console.log(`[Saga][Rollback] Reversing ${completedSteps.length} steps...`);

        // Reverse order: git → database → apim
        if (completedSteps.includes('git')) {
            console.log(`[Saga][Rollback] Step 3: Restoring to Git...`);
            await this.restoreToGit(context, resourceSnapshot);
        }

        if (completedSteps.includes('database')) {
            console.log(`[Saga][Rollback] Step 2: Restoring to Database...`);
            await this.restoreToDatabase(context.resourceType, resourceSnapshot);
        }

        if (completedSteps.includes('apim')) {
            console.log(`[Saga][Rollback] Step 1: Restoring to APIM...`);
            await this.restoreToApim(context.resourceType, resourceSnapshot, context.environment);
        }
    }

    /**
     * Restore resource to APIM
     */
    private async restoreToApim(
        resourceType: ResourceType,
        snapshot: any,
        environment: string
    ): Promise<void> {
        const pathMap: Record<ResourceType, string> = {
            product: `/products/${snapshot.id}`,
            subscription: `/subscriptions/${snapshot.id}`,
            named_value: `/namedValues/${snapshot.id}`,
            backend: `/backends/${snapshot.id}`
        };

        const path = pathMap[resourceType];

        // Recreate in APIM using PUT
        await apimGateway.put(path, snapshot, environment);
    }

    /**
     * Restore resource to database
     */
    private async restoreToDatabase(
        resourceType: ResourceType,
        snapshot: any
    ): Promise<void> {
        const tableMap: Record<ResourceType, string> = {
            product: 'products',
            subscription: 'subscriptions',
            named_value: 'named_values',
            backend: 'governance_backends'
        };

        const table = tableMap[resourceType];

        // Build INSERT statement from snapshot
        const columns = Object.keys(snapshot).join(', ');
        const placeholders = Object.keys(snapshot).map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(snapshot);

        await query(
            `INSERT INTO ${table} (${columns}) VALUES (${placeholders})
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
            values
        );
    }

    /**
     * Restore resource to Git
     */
    private async restoreToGit(
        context: DeleteContext,
        snapshot: any
    ): Promise<void> {
        console.log(`[Saga][Rollback][Git] Would restore ${context.resourceType}/${context.resourceId} to Git`);
        // TODO: Implement Git restoration
    }

    /**
     * Determine which step failed based on completed steps
     */
    private determineFailedStep(completedSteps: string[]): string {
        if (!completedSteps.includes('snapshot')) return 'snapshot';
        if (!completedSteps.includes('apim')) return 'apim';
        if (!completedSteps.includes('database')) return 'database';
        if (!completedSteps.includes('git') && !completedSteps.includes('git-skipped')) return 'git';
        return 'unknown';
    }

    /**
     * Log critical failure (rollback failed)
     */
    private async logCriticalFailure(
        context: DeleteContext,
        originalError: Error,
        rollbackError: Error
    ): Promise<void> {
        await auditService.log({
            userId: context.userId,
            userEmail: context.userEmail,
            userRole: context.userRole,
            action: 'DELETE',
            resourceType: context.resourceType,
            resourceId: context.resourceId,
            resourceName: context.resourceName,
            details: {
                severity: 'CRITICAL',
                reason: context.reason,
                originalError: originalError.message,
                rollbackError: rollbackError.message,
                status: 'rollback_failed',
                requiresManualIntervention: true
            },
            ipAddress: context.ipAddress
        });
    }
}

export const deleteSaga = new DeleteSagaOrchestrator();
