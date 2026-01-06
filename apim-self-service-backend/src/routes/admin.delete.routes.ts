/**
 * Admin Delete Routes (Saga-based)
 * 
 * Endpoints for admin-only deletion of orphaned resources.
 * Uses saga orchestration pattern for distributed transactions:
 * - APIM deletion
 * - Database deletion  
 * - Git commit (for resources with config)
 * - Automatic rollback on any failure
 */

import { FastifyPluginAsync } from 'fastify';
import { deleteSaga } from '../services/deleteSaga.js';
import { getUserId } from '../middleware/auth.js';

const adminDeleteRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * DELETE /api/v1/admin/products/:id
     * Delete a single orphaned product (admin only)
     */
    fastify.delete('/admin/products/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { reason } = request.body as { reason?: string };

        // Validate reason
        if (!reason || reason.trim().length < 10) {
            return reply.status(400).send({
                error: 'Deletion reason required (minimum 10 characters)'
            });
        }

        try {
            // Get user context
            const userId = getUserId(request);
            const userEmail = (request.headers as any)['x-user-email'] as string || userId;
            const userRole = 'admin'; // TODO: Get from auth middleware

            // Extract environment from product ID (format: "product-name:env:environment")
            const environment = id.split(':env:')[1] || 'Global';

            // Execute delete saga
            const result = await deleteSaga.executeDelete({
                resourceType: 'product',
                resourceId: id,
                resourceName: id.split(':')[0],
                environment,
                reason: reason.trim(),
                userId,
                userEmail,
                userRole,
                ipAddress: request.ip
            });

            if (!result.success) {
                return reply.status(500).send({
                    error: 'Delete saga failed',
                    details: result.error,
                    failedStep: result.failedStep,
                    completedSteps: result.completedSteps
                });
            }

            return reply.send({
                success: true,
                auditLogId: result.auditLogId,
                completedSteps: result.completedSteps
            });

        } catch (error: any) {
            fastify.log.error('[Delete] Product deletion failed:', error);
            return reply.status(500).send({
                error: 'Delete operation failed',
                details: error.message
            });
        }
    });

    /**
     * POST /api/v1/admin/products/bulk-delete
     * Bulk delete multiple orphaned products (admin only)
     */
    fastify.post('/admin/products/bulk-delete', async (request, reply) => {
        const { productIds, reason } = request.body as {
            productIds?: string[];
            reason?: string;
        };

        // Validate inputs
        if (!reason || reason.trim().length < 10) {
            return reply.status(400).send({
                error: 'Deletion reason required (minimum 10 characters)'
            });
        }

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return reply.status(400).send({ error: 'Product IDs array required' });
        }

        const succeeded: string[] = [];
        const failed: Array<{ id: string; error: string; failedStep?: string }> = [];

        try {
            // Get user context
            const userId = getUserId(request);
            const userEmail = (request.headers as any)['x-user-email'] as string || userId;
            const userRole = 'admin';

            // Execute saga for each product
            for (const id of productIds) {
                try {
                    const environment = id.split(':env:')[1] || 'Global';
                    const productName = id.split(':')[0];

                    const result = await deleteSaga.executeDelete({
                        resourceType: 'product',
                        resourceId: id,
                        resourceName: productName,
                        environment,
                        reason: reason.trim(),
                        userId,
                        userEmail,
                        userRole,
                        ipAddress: request.ip
                    });

                    if (result.success) {
                        succeeded.push(productName);
                    } else {
                        failed.push({
                            id,
                            error: result.error || 'Unknown error',
                            failedStep: result.failedStep
                        });
                    }

                } catch (itemError: any) {
                    failed.push({ id, error: itemError.message });
                }
            }

            return reply.send({
                deleted: succeeded.length,
                failed: failed.length,
                failures: failed,
                succeeded
            });

        } catch (error: any) {
            fastify.log.error('[Delete] Bulk deletion failed:', error);
            return reply.status(500).send({
                error: 'Bulk delete operation failed',
                details: error.message
            });
        }
    });



    /**
     * POST /api/v1/admin/subscriptions/bulk-delete
     */
    fastify.post('/admin/subscriptions/bulk-delete', async (request, reply) => {
        const { subscriptionIds, reason } = request.body as { subscriptionIds?: string[]; reason?: string; };
        return handleBulkDelete(request, reply, 'subscription', subscriptionIds, reason);
    });

    /**
     * DELETE /api/v1/admin/subscriptions/:id
     * Delete a single orphaned subscription
     */
    fastify.delete('/admin/subscriptions/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { reason } = request.body as { reason?: string };
        return handleDelete(request, reply, 'subscription', id, reason);
    });

    /**
     * POST /api/v1/admin/named-values/bulk-delete
     */
    fastify.post('/admin/named_values/bulk-delete', async (request, reply) => {
        const { named_valueIds, reason } = request.body as { named_valueIds?: string[]; reason?: string; };
        // frontend sends named_valueIds based on key=${resourceType}Ids logic in client
        return handleBulkDelete(request, reply, 'named_value', named_valueIds, reason);
    });

    /**
     * DELETE /api/v1/admin/named-values/:id
     * Delete a single orphaned named value
     */
    fastify.delete('/admin/named-values/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { reason } = request.body as { reason?: string };
        return handleDelete(request, reply, 'named_value', id, reason);
    });

    /**
     * POST /api/v1/admin/backends/bulk-delete
     */
    fastify.post('/admin/backends/bulk-delete', async (request, reply) => {
        const { backendIds, reason } = request.body as { backendIds?: string[]; reason?: string; };
        return handleBulkDelete(request, reply, 'backend', backendIds, reason);
    });

    /**
     * DELETE /api/v1/admin/backends/:id
     * Delete a single orphaned backend
     */
    fastify.delete('/admin/backends/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const { reason } = request.body as { reason?: string };
        return handleDelete(request, reply, 'backend', id, reason);
    });
};

// Helper for single delete
async function handleDelete(request: any, reply: any, resourceType: any, id: string, reason?: string) {
    if (!reason || reason.trim().length < 10) {
        return reply.status(400).send({
            error: 'Deletion reason required (minimum 10 characters)'
        });
    }

    try {
        const userId = getUserId(request);
        const userEmail = (request.headers as any)['x-user-email'] as string || userId;
        const userRole = 'admin';
        const environment = id.split(':env:')[1] || 'Global';

        const result = await deleteSaga.executeDelete({
            resourceType,
            resourceId: id,
            resourceName: id.split(':')[0],
            environment,
            reason: reason.trim(),
            userId,
            userEmail,
            userRole,
            ipAddress: request.ip
        });

        if (!result.success) {
            return reply.status(500).send({
                error: 'Delete saga failed',
                details: result.error,
                failedStep: result.failedStep,
                completedSteps: result.completedSteps
            });
        }

        return reply.send({ success: true, auditLogId: result.auditLogId, completedSteps: result.completedSteps });

    } catch (error: any) {
        request.log.error(`[Delete] ${resourceType} deletion failed:`, error);
        return reply.status(500).send({ error: 'Delete operation failed', details: error.message });
    }
}

// Helper for bulk delete
async function handleBulkDelete(request: any, reply: any, resourceType: any, ids?: string[], reason?: string) {
    if (!reason || reason.trim().length < 10) {
        return reply.status(400).send({
            error: 'Deletion reason required (minimum 10 characters)'
        });
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return reply.status(400).send({ error: 'IDs array required' });
    }

    const succeeded: string[] = [];
    const failed: Array<{ id: string; error: string; failedStep?: string }> = [];

    try {
        const userId = getUserId(request);
        const userEmail = (request.headers as any)['x-user-email'] as string || userId;
        const userRole = 'admin';

        for (const id of ids) {
            try {
                const environment = id.split(':env:')[1] || 'Global';
                const resourceName = id.split(':')[0];

                const result = await deleteSaga.executeDelete({
                    resourceType,
                    resourceId: id,
                    resourceName,
                    environment,
                    reason: reason.trim(),
                    userId,
                    userEmail,
                    userRole,
                    ipAddress: request.ip
                });

                if (result.success) {
                    succeeded.push(resourceName);
                } else {
                    failed.push({
                        id,
                        error: result.error || 'Unknown error',
                        failedStep: result.failedStep
                    });
                }
            } catch (itemError: any) {
                failed.push({ id, error: itemError.message });
            }
        }

        return reply.send({
            deleted: succeeded.length,
            failed: failed.length,
            failures: failed,
            succeeded
        });

    } catch (error: any) {
        request.log.error(`[Delete] Bulk ${resourceType} deletion failed:`, error);
        return reply.status(500).send({
            error: 'Bulk delete operation failed',
            details: error.message
        });
    }
}

export default adminDeleteRoutes;
