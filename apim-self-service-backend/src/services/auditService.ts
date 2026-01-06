/**
 * Audit Service
 * 
 * Comprehensive audit logging for all sensitive operations.
 * Logs to audit_log table with full traceability.
 */

import { query } from './db.js';

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
            const result = await query(
                `INSERT INTO audit_log 
          (user_id, user_email, user_role, action, resource_type, resource_id, resource_name, details, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
                [
                    entry.userId,
                    entry.userEmail,
                    entry.userRole,
                    entry.action,
                    entry.resourceType,
                    entry.resourceId,
                    entry.resourceName || null,
                    entry.details ? JSON.stringify(entry.details) : null,
                    entry.ipAddress || null
                ]
            );

            const auditId = result.rows[0]?.id || 'unknown';

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
    async queryLogs(filters: {
        userId?: string;
        action?: AuditAction;
        resourceType?: ResourceType;
        resourceId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        limit?: number;
    }): Promise<any[]> {
        const conditions: string[] = [];
        const params: any[] = [];
        let paramCounter = 1;

        if (filters.userId) {
            conditions.push(`user_id = $${paramCounter++}`);
            params.push(filters.userId);
        }

        if (filters.action) {
            conditions.push(`action = $${paramCounter++}`);
            params.push(filters.action);
        }

        if (filters.resourceType) {
            conditions.push(`resource_type = $${paramCounter++}`);
            params.push(filters.resourceType);
        }

        if (filters.resourceId) {
            conditions.push(`resource_id = $${paramCounter++}`);
            params.push(filters.resourceId);
        }

        if (filters.dateFrom) {
            conditions.push(`created_at >= $${paramCounter++}`);
            params.push(filters.dateFrom);
        }

        if (filters.dateTo) {
            conditions.push(`created_at <= $${paramCounter++}`);
            params.push(filters.dateTo);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const limitClause = `LIMIT ${filters.limit || 100}`;

        const sql = `
      SELECT * FROM audit_log
      ${whereClause}
      ORDER BY created_at DESC
      ${limitClause}
    `;

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Get audit trail for specific resource
     */
    async getResourceAudit(resourceType: ResourceType, resourceId: string): Promise<any[]> {
        const result = await query(
            `SELECT * FROM audit_log
       WHERE resource_type = $1 AND resource_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
            [resourceType, resourceId]
        );
        return result.rows;
    }
}

export const auditService = new AuditService();
