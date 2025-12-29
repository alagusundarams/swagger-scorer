/**
 * @fileoverview Subscriptions Service
 * 
 * Handles subscription management, including creation, state updates, and queries
 */

import { query } from './db.js';
import { logAudit } from './audit.service.js';

/**
 * Fetch all subscriptions with app registration data
 * @param userRole Optional user role (admin sees all)
 * @param teamId Optional team ID filter (ignored if userRole is 'admin')
 */
export async function getAllSubscriptions(userRole?: string, teamId?: string) {
    // Build WHERE clause - admin sees all, regular users see only their team's subscriptions
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (teamId && userRole !== 'admin') {
        whereConditions.push('s.subscriber_team_id = $1');
        queryParams.push(teamId);
    }

    const whereClause = whereConditions.length > 0
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

    const res = await query(`
        SELECT s.*, 
               p.display_name as product_name, 
               t.name as team_name,
               ar.id as app_id,
               ar.display_name as app_display_name,
               ar.client_id as app_client_id,
               ar.environment as app_environment
        FROM subscriptions s
        JOIN products p ON s.product_id = p.id
        JOIN teams t ON s.subscriber_team_id = t.id
        LEFT JOIN app_registrations ar ON s.app_registration_id = ar.id
        ${whereClause}
        ORDER BY s.created_at DESC
    `, queryParams);

    return res.rows.map(s => ({
        ...s,
        productId: s.product_id,
        subscriberTeamId: s.subscriber_team_id,
        createdAt: s.created_at,
        expirationDate: s.expiration_date,
        keysGeneratedAt: s.keys_generated_at,
        lastSyncedAt: s.last_synced_at,
        primaryKey: { name: 'Primary', value: s.primary_key_value || '••••••••' },
        secondaryKey: { name: 'Secondary', value: s.secondary_key_value || '••••••••' },
        appRegistration: s.app_id ? {
            id: s.app_id,
            displayName: s.app_display_name,
            clientId: s.app_client_id,
            environment: s.app_environment
        } : null
    }));
}

/**
 * Create a new subscription request (creates pending subscription + approval)
 */
export async function addSubscription(productId: string, teamId: string, requester: { name: string, email: string }, appId?: string, justification?: string) {
    const subId = `sub-${Math.random().toString(36).substr(2, 9)}`;
    const approvalId = `appr-${Math.random().toString(36).substr(2, 9)}`;

    // 1. Create Approval Request
    await query(`
        INSERT INTO approval_requests (id, type, status, requester_name, requester_email, requester_team_id, details)
        VALUES ($1, 'SUBSCRIPTION', 'PENDING', $2, $3, $4, $5)
    `, [approvalId, requester.name, requester.email, teamId, JSON.stringify({ productId, subscriptionId: subId, appId, justification })]);

    // 2. Create Pending Subscription
    const res = await query(`
        INSERT INTO subscriptions (id, product_id, subscriber_team_id, state, app_registration_id)
        VALUES ($1, $2, $3, 'pending', $4)
        RETURNING *
    `, [subId, productId, teamId, appId]);

    // 3. Log Audit
    await logAudit({
        entityType: 'SUBSCRIPTION',
        entityId: subId,
        action: 'CREATE_SUBSCRIPTION',
        userId: requester.email,
        changes: { productId, teamId, appId }
    });

    return {
        ...res.rows[0],
        productId: res.rows[0].product_id,
        subscriberTeamId: res.rows[0].subscriber_team_id,
        appRegistrationId: res.rows[0].app_registration_id
    };
}

/**
 * Update subscription state directly (e.g., suspend, reactivate)
 */
export async function updateSubscriptionState(id: string, state: string) {
    await query(`
        UPDATE subscriptions
        SET state = $1, updated_at = NOW()
        WHERE id = $2
    `, [state, id]);

    // 2. Log Audit
    await logAudit({
        entityType: 'SUBSCRIPTION',
        entityId: id,
        action: `UPDATE_STATE_${state.toUpperCase()}`,
        userId: 'system-user',
        changes: { state }
    });
}
