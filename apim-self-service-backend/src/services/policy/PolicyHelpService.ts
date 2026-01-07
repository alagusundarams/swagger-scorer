/**
 * @fileoverview Policy Help Service
 * 
 * Manages help requests from teams to APIM DEV team
 * CLEAN BOUNDARY: Can be extracted to separate microservice later
 */

import { query } from '../core/db.js';

export interface PolicyHelpRequest {
    id: string;
    userId: string;
    teamId: string;
    productId?: string;
    apiId?: string;
    policyXml?: string;
    issueDescription: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high';
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
}

export interface PolicyHelpMessage {
    id: number;
    requestId: string;
    userId: string;
    message: string;
    isApimDev: boolean;
    createdAt: Date;
}

/**
 * Create a new help request
 */
export async function createHelpRequest(params: {
    userId: string;
    teamId: string;
    issueDescription: string;
    productId?: string;
    apiId?: string;
    policyXml?: string;
    priority?: 'low' | 'medium' | 'high';
}): Promise<PolicyHelpRequest> {
    const result = await query(`
        INSERT INTO policy_help_requests (
            user_id, team_id, product_id, api_id,
            policy_xml, issue_description, priority
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `, [
        params.userId,
        params.teamId,
        params.productId || null,
        params.apiId || null,
        params.policyXml || null,
        params.issueDescription,
        params.priority || 'medium'
    ]);

    return mapHelpRequest(result.rows[0]);
}

/**
 * Get all help requests (with filters)
 */
export async function getHelpRequests(filters?: {
    userId?: string;
    teamId?: string;
    status?: string;
}): Promise<PolicyHelpRequest[]> {
    let whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        params.push(filters.userId);
    }

    if (filters?.teamId) {
        whereConditions.push(`team_id = $${paramIndex++}`);
        params.push(filters.teamId);
    }

    if (filters?.status) {
        whereConditions.push(`status = $${paramIndex++}`);
        params.push(filters.status);
    }

    const whereClause = whereConditions.length > 0
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

    const result = await query(`
        SELECT * FROM policy_help_requests
        ${whereClause}
        ORDER BY 
            CASE status 
                WHEN 'open' THEN 1
                WHEN 'in_progress' THEN 2
                WHEN 'resolved' THEN 3
                WHEN 'closed' THEN 4
            END,
            priority DESC,
            created_at DESC
    `, params);

    return result.rows.map(mapHelpRequest);
}

/**
 * Get a single help request by ID
 */
export async function getHelpRequest(requestId: string): Promise<PolicyHelpRequest | null> {
    const result = await query(`
        SELECT * FROM policy_help_requests
        WHERE id = $1
    `, [requestId]);

    if (result.rows.length === 0) {
        return null;
    }

    return mapHelpRequest(result.rows[0]);
}

/**
 * Add a message to a help request
 */
export async function addHelpMessage(params: {
    requestId: string;
    userId: string;
    message: string;
    isApimDev: boolean;
}): Promise<PolicyHelpMessage> {
    const result = await query(`
        INSERT INTO policy_help_messages (
            request_id, user_id, message, is_apim_dev
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `, [
        params.requestId,
        params.userId,
        params.message,
        params.isApimDev
    ]);

    // Update request status to in_progress if first APIM DEV response
    if (params.isApimDev) {
        await query(`
            UPDATE policy_help_requests
            SET status = 'in_progress', updated_at = NOW()
            WHERE id = $1 AND status = 'open'
        `, [params.requestId]);
    }

    return mapHelpMessage(result.rows[0]);
}

/**
 * Get messages for a help request
 */
export async function getHelpMessages(requestId: string): Promise<PolicyHelpMessage[]> {
    const result = await query(`
        SELECT * FROM policy_help_messages
        WHERE request_id = $1
        ORDER BY created_at ASC
    `, [requestId]);

    return result.rows.map(mapHelpMessage);
}

/**
 * Update help request status
 */
export async function updateHelpRequestStatus(
    requestId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
    resolvedBy?: string
): Promise<void> {
    await query(`
        UPDATE policy_help_requests
        SET status = $1,
            resolved_by = $2,
            updated_at = NOW()
        WHERE id = $3
    `, [status, resolvedBy || null, requestId]);
}

/**
 * Get open help requests (view for APIM DEV team)
 */
export async function getOpenHelpRequests() {
    const result = await query(`
        SELECT * FROM open_help_requests
    `);

    return result.rows;
}

// Mappers
function mapHelpRequest(row: any): PolicyHelpRequest {
    return {
        id: row.id,
        userId: row.user_id,
        teamId: row.team_id,
        productId: row.product_id,
        apiId: row.api_id,
        policyXml: row.policy_xml,
        issueDescription: row.issue_description,
        status: row.status,
        priority: row.priority,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        resolvedBy: row.resolved_by
    };
}

function mapHelpMessage(row: any): PolicyHelpMessage {
    return {
        id: row.id,
        requestId: row.request_id,
        userId: row.user_id,
        message: row.message,
        isApimDev: row.is_apim_dev,
        createdAt: new Date(row.created_at)
    };
}
