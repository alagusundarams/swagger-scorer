import { FastifyReply, FastifyRequest } from 'fastify';
import { deleteSaga } from '../services/workflow/sagas/DeleteSaga.js';
import { getUserId } from '../middleware/auth.js';
import { getAppConfig } from '../config/loader.js';
import { ResourceType } from '../services/core/AuditService.js';

export class AdminController {

    /**
     * Delete a single resource via Saga
     */
    async deleteResource(request: FastifyRequest, reply: FastifyReply, resourceType: ResourceType) {
        const { id } = request.params as { id: string };
        const { reason } = request.body as { reason?: string };

        if (!reason || reason.trim().length < 10) {
            return reply.status(400).send({
                error: 'Deletion reason required (minimum 10 characters)'
            });
        }

        try {
            const userId = getUserId(request);
            const userEmail = (request.headers as any)['x-user-email'] as string || userId;
            const userRole = 'admin'; // Authorization should be handled by middleware, but context is set here

            // Extract environment from ID (format: "name:env:environment")
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

            if (!result.success) {
                return reply.status(500).send({
                    error: 'Delete saga failed',
                    details: result.error,
                    failedStep: result.failedStep,
                    completedSteps: result.completedSteps
                });
            }

            return {
                success: true,
                auditLogId: result.auditLogId,
                completedSteps: result.completedSteps
            };

        } catch (error: any) {
            request.log.error({ err: error }, `[Delete] ${resourceType} deletion failed`);
            return reply.status(500).send({ error: 'Delete operation failed', details: error.message });
        }
    }

    /**
     * Bulk delete resources via Saga
     */
    async bulkDeleteResources(request: FastifyRequest, reply: FastifyReply, resourceType: ResourceType, idsField: string) {
        const body = request.body as any;
        const ids = body[idsField] as string[];
        const { reason } = body;

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

            return {
                deleted: succeeded.length,
                failed: failed.length,
                failures: failed,
                succeeded
            };

        } catch (error: any) {
            request.log.error({ err: error }, `[Delete] Bulk ${resourceType} deletion failed`);
            return reply.status(500).send({
                error: 'Bulk delete operation failed',
                details: error.message
            });
        }
    }

    // SCORING METHODS

    async scoreAllProducts(request: FastifyRequest, reply: FastifyReply) {
        try {
            const config = getAppConfig();
            const isMock = config.useBackendMocks;
            const { scoreAllProducts } = isMock
                ? await import('../services/policy/ScoringService.mock.js')
                : await import('../services/policy/ScoringService.js');

            // Trigger background job (don't await - return immediately)
            scoreAllProducts()
                .then((result: any) => {
                    request.log.info({ result }, 'Background scoring completed');
                })
                .catch((err: any) => {
                    request.log.error({ err }, 'Background scoring failed');
                });

            return { message: 'Scoring job started in background' };
        } catch (error: any) {
            request.log.error({ err: error }, 'Error starting scoring job');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to start scoring job' });
        }
    }

    async scoreProduct(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        try {
            const config = getAppConfig();
            const isMock = config.useBackendMocks;
            const { scoreProductById } = isMock
                ? await import('../services/policy/ScoringService.mock.js')
                : await import('../services/policy/ScoringService.js');

            const score = await scoreProductById(id);
            if (score === null) {
                return reply.status(404).send({ error: 'Not Found', message: 'Product has no OpenAPI spec to score' });
            }
            return { productId: id, qualityScore: score };
        } catch (error: any) {
            request.log.error({ err: error }, 'Error scoring product');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to score product' });
        }
    }
}
