/**
 * Audit Service
 * 
 * Comprehensive audit logging for all sensitive operations.
 * Logs to audit_log table with full traceability.
 */

import { db } from '../config/database';

export type AuditAction =
    | 'DELETE'
    | 'BULK_DELETE'
    | 'READ_KEYS'
    | 'READ_SECRET'
    | 'BULK_ASSIGN'
    | 'CREATE'
    | 'UPDATE';

export type ResourceType =
    | 'product'
    | 'subscription'
    | 'named_value'
    | 'backend';

export interface AuditLogEntry {
    userId: string;
    userEmail: string;
    userRole: string;
    action: AuditAction;
    resourceType: ResourceType;
    resourceId: string;
    resourceName?: string;
    details?: Record<string, any>;
    ipAddress?: string;
}

export class AuditService {
    /**
     * Log an audit entry
     * @returns Audit log ID
     */
    async log(entry: AuditLogEntry): Promise<string> {
        try {
            const result = await db('audit_log')
                .insert({
                    user_id: entry.userId,
                    user_email: entry.userEmail,
                    user_role: entry.userRole,
                    action: entry.action,
                    resource_type: entry.resourceType,
                    resource_id: entry.resourceId,
                    resource_name: entry.resourceName,
                    details: entry.details ? JSON.stringify(entry.details) : null,
                    ip_address: entry.ipAddress,
                    created_at: new Date()
                })
                .returning('id');

            const auditId = result[0]?.id || result[0];

            console.log(`[Audit] ${entry.action} on ${entry.resourceType}/${entry.resourceId} by ${entry.userEmail}`);

            return auditId;
        } catch (error) {
            console.error('[Audit] Failed to log entry:', error);
            // Don't throw - audit failure shouldn't block operations
            return 'audit-failed';
        }
    }

    /**
     * Query audit logs with filters
     */
    async query(filters: {
        userId?: string;
        action?: AuditAction;
        resourceType?: ResourceType;
        resourceId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
    }): Promise<any[]> {
        let query = db('audit_log').select('*');

        if (filters.userId) {
            query = query.where('user_id', filters.userId);
        }

        if (filters.action) {
            query = query.where('action', filters.action);
        }

        if (filters.resourceType) {
            query = query.where('resource_type', filters.resourceType);
        }

        if (filters.resourceId) {
            query = query.where('resource_id', filters.resourceId);
        }

        if (filters.dateFrom) {
            query = query.where('created_at', '>=', filters.dateFrom);
        }

        if (filters.dateTo) {
            query = query.where('created_at', '<=', filters.dateTo);
        }

        query = query.orderBy('created_at', 'desc');
        query = query.limit(filters.limit || 100);

        return await query;
    }

    /**
     * Get audit trail for specific resource
     */
    async getResourceAudit(resourceType: ResourceType, resourceId: string): Promise<any[]> {
        return await db('audit_log')
            .where({ resource_type: resourceType, resource_id: resourceId })
            .orderBy('created_at', 'desc')
            .limit(50);
    }
}

export const auditService = new AuditService();
