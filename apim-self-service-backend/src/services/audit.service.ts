/**
 * @fileoverview Audit Service
 * 
 * Handles logging and fetching of audit trails in the database.
 */

import { query } from './db.js';

export interface AuditLogEntry {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    changes: any;
}

/**
 * Log a new audit entry
 */
export async function logAudit(entry: AuditLogEntry) {
    const { entityType, entityId, action, userId, changes } = entry;

    await query(`
        INSERT INTO audit_log (entity_type, entity_id, action, user_id, changes)
        VALUES ($1, $2, $3, $4, $5)
    `, [entityType, entityId, action, userId, JSON.stringify(changes)]);
}

/**
 * Fetch audit logs, optionally filtered by entity
 */
export async function getAuditLogs(entityId?: string) {
    let sql = `
        SELECT l.*, u.name as user_name
        FROM audit_log l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.timestamp DESC
    `;
    const params: any[] = [];

    if (entityId) {
        sql = `
            SELECT l.*, u.name as user_name
            FROM audit_log l
            LEFT JOIN users u ON l.user_id = u.id
            WHERE entity_id = $1
            ORDER BY l.timestamp DESC
        `;
        params.push(entityId);
    }

    const res = await query(sql, params);
    return res.rows.map(row => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        action: row.action,
        userId: row.user_id,
        userName: row.user_name || row.user_id,
        changes: row.changes,
        timestamp: row.timestamp
    }));
}
