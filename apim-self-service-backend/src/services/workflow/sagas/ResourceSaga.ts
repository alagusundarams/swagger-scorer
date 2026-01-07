import { logAudit } from '../../core/AuditService.js';
import { getGenericResource, createProduct, createApi, createNamedValue, createBackend, createSubscription } from '../../apim/ApimService.js';

interface UpdateContext {
    resourceType: 'product' | 'api' | 'named_value' | 'backend' | 'subscription';
    resourceId: string;
    payload: any;
    user: { id: string, email: string };
    environment: string;
    productContextId?: string; // For API linkage if needed
}

export class ResourceSagaOrchestrator {

    /**
     * Executes an Atomic Update with Rollback ("Snapshot & Restore" Pattern)
     */
    public async executeUpdate(context: UpdateContext) {
        console.log(`[ResourceSaga] Starting UPDATE for ${context.resourceType}/${context.resourceId}`);

        // 1. SNAPSHOT Phase (Read-Before-Write)
        let snapshot: any = null;
        try {
            snapshot = await getGenericResource(context.resourceType, context.resourceId, context.environment);
            if (snapshot) {
                console.log(`[ResourceSaga] Snapshot taken for ${context.resourceId}`);
            } else {
                console.warn(`[ResourceSaga] No existing resource found for ${context.resourceId}. Update acts as Create.`);
            }
        } catch (snapError) {
            console.error(`[ResourceSaga] Snapshot failed. Aborting to prevent data loss.`, snapError);
            throw new Error(`Safety Check Failed: Could not backup current state.`);
        }

        // 2. EXECUTION Phase
        try {
            await this.performUpdate(context);

            // Audit Success
            await logAudit({
                resourceType: context.resourceType,
                resourceId: context.resourceId,
                action: 'UPDATE_SAGA_COMPLETE',
                userId: context.user.id,
                userEmail: context.user.email,
                userRole: 'system',
                details: { status: 'success', environment: context.environment }
            });

        } catch (updateError: any) {
            console.error(`[ResourceSaga] Update Failed: ${updateError.message}. Initiating ROLLBACK.`);

            // 3. ROLLBACK Phase
            try {
                if (snapshot) {
                    console.log(`[ResourceSaga] Restoring snapshot for ${context.resourceId}...`);
                    await this.performUpdate({ ...context, payload: snapshot }); // Restore old payload
                    console.log(`[ResourceSaga] ✅ Rollback Successful (Restored).`);
                } else {
                    // It didn't exist before, so we created it. Rollback = Delete.
                    console.log(`[ResourceSaga] Deleting created resource (Rollback to clean)...`);
                    await this.performDelete(context);
                    console.log(`[ResourceSaga] ✅ Rollback Successful (Deleted).`);
                }

                await logAudit({
                    resourceType: context.resourceType,
                    resourceId: context.resourceId,
                    action: 'UPDATE_SAGA_ROLLBACK',
                    userId: context.user.id,
                    userEmail: context.user.email,
                    userRole: 'system',
                    details: {
                        error: updateError.message,
                        rollbackStatus: 'success'
                    }
                });

            } catch (rollbackError: any) {
                console.error(`[ResourceSaga] ❌ CRITICAL: ROLLBACK FAILED. Data may be inconsistent.`);
                // Log Critical Alert
                await logAudit({
                    resourceType: context.resourceType,
                    resourceId: context.resourceId,
                    action: 'SAGA_CRITICAL_FAILURE',
                    userId: context.user.id,
                    userEmail: context.user.email,
                    userRole: 'system',
                    details: {
                        originalError: updateError.message,
                        rollbackError: rollbackError.message
                    }
                });
            }
            throw updateError; // Re-throw original error to caller
        }
    }

    private async performUpdate(context: UpdateContext) {
        // Maps resource types to specific APIM calls (PUT/PATCH behaviour)
        switch (context.resourceType) {
            case 'product':
                // Note: Payload name vs ID needs careful handling. Assuming payload contains full ARM body.
                await createProduct(context.resourceId, context.payload, context.environment);
                break;
            case 'api':
                await createApi(context.productContextId || '', { name: context.resourceId, ...context.payload }, context.environment);
                break;
            case 'named_value':
                await createNamedValue(context.productContextId || '', { name: context.resourceId, ...context.payload }, context.environment);
                break;
            case 'backend':
                await createBackend({ name: context.resourceId, ...context.payload }, context.environment);
                break;
            case 'subscription':
                await createSubscription(context.resourceId, context.payload, context.environment);
                break;
            default:
                throw new Error(`Unsupported type: ${context.resourceType}`);
        }
    }

    private async performDelete(context: UpdateContext) {
        // Only implemented for Subscription currently clearly in apim.service. 
        // Need to ensure ArmService.deleteResource is accessible for others if we want generic delete here.
        // Or we use deleteSaga? But we want atomic call here.
        // For now, mapping manual deletes available or throwing.

        const arm = (await import('../../apim/ApimService.js')).getArmService(context.environment);
        const service = await arm; // Await promise

        // Use generic deleteResource
        let path = '';
        switch (context.resourceType) {
            case 'product': path = `products/${context.resourceId}`; break;
            case 'api': path = `apis/${context.resourceId}`; break;
            case 'named_value': path = `namedValues/${context.resourceId}`; break;
            case 'backend': path = `backends/${context.resourceId}`; break;
            case 'subscription': path = `subscriptions/${context.resourceId}`; break;
        }
        await service.deleteResource(path);
    }
}

export const resourceSaga = new ResourceSagaOrchestrator();
