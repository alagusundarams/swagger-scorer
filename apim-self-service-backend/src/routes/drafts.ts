/**
 * @fileoverview Drafts Routes
 * 
 * Routes for managing draft files (contracts, policies, configs)
 * Comprehensive file management with database tracking
 */

import { FastifyPluginAsync } from 'fastify';
import {
    createDraft,
    getDraft,
    getUserDrafts,
    downloadDraft,
    deleteDraft,
    cleanupExpiredDrafts
} from '../services/inventory/DraftsService.js';
import { initBlobStorage } from '../services/storage/BlobStorageService.js';
import { getUserId } from '../middleware/auth.js';

const draftsRoute: FastifyPluginAsync = async (fastify) => {
    // Initialize blob storage on startup
    initBlobStorage();

    // Run cleanup on startup and then every hour
    cleanupExpiredDrafts().catch(err => console.error('[Drafts] Initial cleanup failed:', err));
    setInterval(() => {
        cleanupExpiredDrafts().catch(err => console.error('[Drafts] Cleanup failed:', err));
    }, 60 * 60 * 1000);

    /**
     * POST /api/v1/drafts/upload
     * Upload a new draft file
     */
    fastify.post('/drafts/upload', async (request, reply) => {
        try {
            // Get file from multipart data
            const data = await request.file();

            if (!data) {
                return reply.code(400).send({
                    error: 'Bad Request',
                    message: 'No file provided'
                });
            }

            // Get file buffer
            const buffer = await data.toBuffer();

            // Get metadata from fields
            const fileType = (data.fields['fileType'] as any)?.value || 'other';
            const productId = (data.fields['productId'] as any)?.value;
            const apiId = (data.fields['apiId'] as any)?.value;
            const contextNotes = (data.fields['contextNotes'] as any)?.value;

            // Get authenticated user ID
            const userId = getUserId(request);

            // Create draft
            const draft = await createDraft({
                userId,
                file: buffer,
                fileName: data.filename,
                fileType,
                mimeType: data.mimetype,
                productId,
                apiId,
                contextNotes
            });

            fastify.log.info({ draftId: draft.id }, 'Draft uploaded successfully');

            return {
                success: true,
                draft: {
                    id: draft.id,
                    fileName: draft.fileName,
                    fileType: draft.fileType,
                    fileSizeBytes: draft.fileSizeBytes,
                    uploadedAt: draft.uploadedAt,
                    expiresAt: draft.expiresAt,
                    status: draft.status
                }
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Failed to upload draft');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to upload draft file'
            });
        }
    });

    /**
     * POST /api/v1/drafts
     * Alias for upload
     */
    fastify.post('/drafts', async (request, _reply) => {
        return fastify.inject({
            method: 'POST',
            url: '/api/v1/drafts/upload',
            payload: request.body as any
        }).then(res => JSON.parse(res.payload));
    });

    /**
     * POST /api/v1/provisioning/drafts
     * Another alias for upload (used by provisioning wizard)
     */
    fastify.post('/provisioning/drafts', async (request, _reply) => {
        return fastify.inject({
            method: 'POST',
            url: '/api/v1/drafts/upload',
            payload: request.body as any
        }).then(res => JSON.parse(res.payload));
    });

    /**
     * GET /api/v1/drafts
     * Get all drafts for current user
     */
    fastify.get('/drafts', async (request, reply) => {
        try {
            const userId = getUserId(request);

            const drafts = await getUserDrafts(userId);

            return {
                success: true,
                count: drafts.length,
                drafts: drafts.map(d => ({
                    id: d.id,
                    fileName: d.fileName,
                    fileType: d.fileType,
                    fileSizeBytes: d.fileSizeBytes,
                    uploadedAt: d.uploadedAt,
                    expiresAt: d.expiresAt,
                    status: d.status,
                    productId: d.productId,
                    apiId: d.apiId
                }))
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Failed to get drafts');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to retrieve drafts'
            });
        }
    });

    /**
     * GET /api/v1/drafts/:id
     * Get draft details
     */
    fastify.get('/drafts/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };

            const draft = await getDraft(id);

            if (!draft) {
                return reply.code(404).send({
                    error: 'Not Found',
                    message: 'Draft not found'
                });
            }

            return {
                success: true,
                draft: {
                    id: draft.id,
                    fileName: draft.fileName,
                    fileType: draft.fileType,
                    fileSizeBytes: draft.fileSizeBytes,
                    mimeType: draft.mimeType,
                    uploadedAt: draft.uploadedAt,
                    expiresAt: draft.expiresAt,
                    status: draft.status,
                    productId: draft.productId,
                    apiId: draft.apiId,
                    contextNotes: draft.contextNotes
                }
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Failed to get draft');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to retrieve draft'
            });
        }
    });

    /**
     * GET /api/v1/drafts/:id/download
     * Download draft file
     */
    fastify.get('/drafts/:id/download', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };

            const { draft, buffer } = await downloadDraft(id);

            // Set appropriate headers
            reply.header('Content-Type', draft.mimeType || 'application/octet-stream');
            reply.header('Content-Disposition', `attachment; filename="${draft.fileName}"`);
            reply.header('Content-Length', buffer.length);

            return buffer;
        } catch (error) {
            fastify.log.error({ err: error }, 'Failed to download draft');
            return reply.code(404).send({
                error: 'Not Found',
                message: error instanceof Error ? error.message : 'Draft not found'
            });
        }
    });

    /**
     * DELETE /api/v1/drafts/:id
     * Delete a draft
     */
    fastify.delete('/drafts/:id', async (request, reply) => {
        try {
            const { id } = request.params as { id: string };

            // TODO: Get real user ID from auth
            const userId = 'user-admin';

            await deleteDraft(id, userId);

            return {
                success: true,
                message: 'Draft deleted successfully'
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Failed to delete draft');

            if (error instanceof Error && error.message.includes('Unauthorized')) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: error.message
                });
            }

            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to delete draft'
            });
        }
    });

    /**
     * POST /api/v1/drafts/cleanup
     * Manually trigger cleanup (admin only)
     */
    fastify.post('/drafts/cleanup', async (_request, reply) => {
        try {
            // TODO: Check admin role

            const deletedCount = await cleanupExpiredDrafts();

            return {
                success: true,
                deletedCount,
                message: `Cleaned up ${deletedCount} expired drafts`
            };
        } catch (error) {
            fastify.log.error({ err: error }, 'Failed to cleanup drafts');
            return reply.code(500).send({
                error: 'Internal Server Error',
                message: 'Failed to cleanup drafts'
            });
        }
    });
};

export default draftsRoute;
