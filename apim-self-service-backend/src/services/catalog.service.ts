/**
 * @fileoverview Catalog Service
 * 
 * Logic for fetching business entities (Products, APIs, Teams) from the database.
 */

import { query } from './db.js';

/**
 * Fetch all products with their associated APIs
 */
export async function getAllProducts() {
    // 1. Fetch products
    const productRes = await query(`
        SELECT p.*, t.name as owner_team_name
        FROM products p
        LEFT JOIN teams t ON p.owner_team_id = t.id
        ORDER BY p.display_name ASC
    `);

    // 2. Fetch all APIs
    const apiRes = await query(`
        SELECT a.*, o.json_data as operations_json
        FROM apis a
        LEFT JOIN LATERAL (
            SELECT json_agg(op.*) as json_data
            FROM operations op
            WHERE op.api_id = a.id
        ) o ON true
    `);

    // 3. Assemble
    const products = productRes.rows.map(p => ({
        ...p,
        displayName: p.display_name,
        ownerTeamId: p.owner_team_id,
        ownerTeamName: p.owner_team_name,
        subscriberCount: p.subscriber_count,
        qualityScore: p.quality_score,
        managementMode: p.management_mode,
        terraformPipelineUrl: p.terraform_pipeline_url,
        apis: apiRes.rows
            .filter(a => a.product_id === p.id)
            .map(a => ({
                ...a,
                displayName: a.display_name,
                operations: a.operations_json || []
            }))
    }));

    return products;
}

/**
 * Fetch all teams
 */
export async function getAllTeams() {
    const res = await query('SELECT * FROM teams ORDER BY name ASC');
    return res.rows.map(t => ({
        ...t,
        azureAdGroupId: t.azure_ad_group_id,
        memberCount: t.member_count
    }));
}

/**
 * Fetch all subscriptions
 */
export async function getAllSubscriptions() {
    const res = await query(`
        SELECT s.*, p.display_name as product_name, t.name as team_name
        FROM subscriptions s
        JOIN products p ON s.product_id = p.id
        JOIN teams t ON s.subscriber_team_id = t.id
        ORDER BY s.created_at DESC
    `);

    return res.rows.map(s => ({
        ...s,
        productId: s.product_id,
        subscriberTeamId: s.subscriber_team_id,
        primaryKey: { name: 'Primary', value: s.primary_key_value || '••••••••' },
        secondaryKey: { name: 'Secondary', value: s.secondary_key_value || '••••••••' }
    }));
}

/**
 * Fetch all approval requests
 */
export async function getAllApprovals() {
    const res = await query(`
        SELECT a.*, t.name as team_name
        FROM approval_requests a
        JOIN teams t ON a.requester_team_id = t.id
        ORDER BY a.submitted_at DESC
    `);

    return res.rows.map(a => ({
        ...a,
        requesterTeamId: a.requester_team_id,
        requesterTeamName: a.team_name,
        submittedAt: a.submitted_at,
        resolvedAt: a.resolved_at,
        resolvedBy: a.resolved_by,
        productId: a.details.productId,
        // Map to frontend-expected format
        requester: {
            name: a.requester_name,
            email: a.requester_email,
            teamId: a.requester_team_id,
            teamName: a.team_name
        }
    }));
}

/**
 * Handle new subscription request
 */
export async function addSubscription(productId: string, teamId: string, requester: { name: string, email: string }) {
    const subId = `sub-${Math.random().toString(36).substr(2, 9)}`;
    const approvalId = `appr-${Math.random().toString(36).substr(2, 9)}`;

    // 1. Create Approval Request
    await query(`
        INSERT INTO approval_requests (id, type, status, requester_name, requester_email, requester_team_id, details)
        VALUES ($1, 'SUBSCRIPTION', 'PENDING', $2, $3, $4, $5)
    `, [approvalId, requester.name, requester.email, teamId, JSON.stringify({ productId, subscriptionId: subId })]);

    // 2. Create Pending Subscription
    const res = await query(`
        INSERT INTO subscriptions (id, product_id, subscriber_team_id, state)
        VALUES ($1, $2, $3, 'pending')
        RETURNING *
    `, [subId, productId, teamId]);

    return {
        ...res.rows[0],
        productId: res.rows[0].product_id,
        subscriberTeamId: res.rows[0].subscriber_team_id
    };
}

/**
 * Process an approval
 */
export async function updateApproval(id: string, status: 'APPROVED' | 'REJECTED', resolvedBy: string) {
    // 1. Update Approval record
    const apprRes = await query(`
        UPDATE approval_requests 
        SET status = $1, resolved_at = NOW(), resolved_by = $2
        WHERE id = $3
        RETURNING *
    `, [status, resolvedBy, id]);

    if (apprRes.rows.length === 0) throw new Error('Approval not found');

    const approval = apprRes.rows[0];

    // 2. If it was a subscription, update the subscription state
    if (approval.type === 'SUBSCRIPTION' && approval.details.subscriptionId) {
        const subState = status === 'APPROVED' ? 'active' : 'rejected';
        await query(`
            UPDATE subscriptions
            SET state = $1, updated_at = NOW()
            WHERE id = $2
        `, [subState, approval.details.subscriptionId]);
    }

    return approval;
}

/**
 * Direct subscription state update
 */
export async function updateSubscriptionState(id: string, state: string) {
    await query(`
        UPDATE subscriptions
        SET state = $1, updated_at = NOW()
        WHERE id = $2
    `, [state, id]);
}
