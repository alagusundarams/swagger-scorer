/**
 * Admin Delete Routes
 * 
 * Endpoints for admin-only deletion of orphaned resources.
 * Includes:
 * - Single resource delete
 * - Bulk delete
 * - Soft delete with audit trail
 */

import { Router } from 'express';
import { db } from '../config/database';
import { requireAdmin } from '../middleware/auth';
import { auditService } from '../services/auditService';
import { emailService } from '../services/emailService';

const router = Router();

/**
 * DELETE /api/v1/admin/products/:id
 * Delete a single orphaned product (admin only)
 */
router.delete('/admin/products/:id',
    requireAdmin,
    async (req, res) => {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                error: 'Deletion reason required (minimum 10 characters)'
            });
        }

        try {
            // 1. Get product details before delete
            const product = await db('products')
                .where({ id })
                .whereNull('deleted_at')
                .first();

            if (!product) {
                return res.status(404).json({ error: 'Product not found or already deleted' });
            }

            // 2. Check dependencies (prevent deletion if has active subscriptions)
            const activeSubsCount = await db('subscriptions')
                .where({ product_id: id })
                .whereNull('deleted_at')
                .count('* as count')
                .first();

            if (activeSubsCount && parseInt(activeSubsCount.count as string) > 0) {
                return res.status(400).json({
                    error: `Cannot delete - has ${activeSubsCount.count} active subscriptions`
                });
            }

            // 3. Soft delete
            await db('products')
                .where({ id })
                .update({
                    deleted_at: new Date(),
                    deleted_by: req.user.email,
                    deletion_reason: reason.trim()
                });

            // 4. Audit log
            const auditId = await auditService.log({
                userId: req.user.id,
                userEmail: req.user.email,
                userRole: req.user.role,
                action: 'DELETE',
                resourceType: 'product',
                resourceId: id,
                resourceName: product.name || product.display_name,
                details: {
                    reason: reason.trim(),
                    environment: product.environment,
                    ownerTeamId: product.owner_team_id
                },
                ipAddress: req.ip
            });

            // 5. Email notification (stub - logs to console)
            await emailService.sendDeletionNotification({
                deletedBy: req.user.name || req.user.email,
                deletedByEmail: req.user.email,
                resourceType: 'product',
                resourceName: product.name || product.display_name,
                resourceId: id,
                reason: reason.trim(),
                auditLogId: auditId
            });

            res.json({ success: true, auditLogId: auditId });

        } catch (error: any) {
            console.error('[Delete] Product deletion failed:', error);
            res.status(500).json({ error: 'Delete operation failed', details: error.message });
        }
    }
);

/**
 * POST /api/v1/admin/products/bulk-delete
 * Bulk delete multiple orphaned products (admin only)
 */
router.post('/admin/products/bulk-delete',
    requireAdmin,
    async (req, res) => {
        const { productIds, reason } = req.body;

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                error: 'Deletion reason required (minimum 10 characters)'
            });
        }

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: 'Product IDs array required' });
        }

        const succeeded: string[] = [];
        const failed: Array<{ id: string; error: string }> = [];

        try {
            for (const id of productIds) {
                try {
                    // Get product
                    const product = await db('products')
                        .where({ id })
                        .whereNull('deleted_at')
                        .first();

                    if (!product) {
                        failed.push({ id, error: 'Not found or already deleted' });
                        continue;
                    }

                    // Check dependencies
                    const activeSubsCount = await db('subscriptions')
                        .where({ product_id: id })
                        .whereNull('deleted_at')
                        .count('* as count')
                        .first();

                    if (activeSubsCount && parseInt(activeSubsCount.count as string) > 0) {
                        failed.push({ id, error: `Has ${activeSubsCount.count} active subscriptions` });
                        continue;
                    }

                    // Soft delete
                    await db('products')
                        .where({ id })
                        .update({
                            deleted_at: new Date(),
                            deleted_by: req.user.email,
                            deletion_reason: reason.trim()
                        });

                    succeeded.push(product.name || product.display_name || id);

                } catch (itemError: any) {
                    failed.push({ id, error: itemError.message });
                }
            }

            // Single audit log for bulk operation
            const auditId = await auditService.log({
                userId: req.user.id,
                userEmail: req.user.email,
                userRole: req.user.role,
                action: 'BULK_DELETE',
                resourceType: 'product',
                resourceId: productIds.join(','),
                details: {
                    reason: reason.trim(),
                    count: succeeded.length,
                    succeeded,
                    failed
                },
                ipAddress: req.ip
            });

            // Email notification
            if (succeeded.length > 0) {
                await emailService.sendDeletionNotification({
                    deletedBy: req.user.name || req.user.email,
                    deletedByEmail: req.user.email,
                    resourceType: 'product',
                    resourceName: `${succeeded.length} products`,
                    resourceId: 'bulk',
                    reason: reason.trim(),
                    count: succeeded.length,
                    auditLogId: auditId
                });
            }

            res.json({
                deleted: succeeded.length,
                failed: failed.length,
                failures: failed,
                auditLogId: auditId
            });

        } catch (error: any) {
            console.error('[Delete] Bulk deletion failed:', error);
            res.status(500).json({ error: 'Bulk delete operation failed', details: error.message });
        }
    }
);

// Repeat for subscriptions, named_values, backends
// (Identical pattern - omitted for brevity, implement when needed)

export default router;
