/**
 * @fileoverview Apps Service
 * 
 * Handles management of App Registrations (Linked Client IDs)
 */

import { query } from '../core/db.js';
import { logAudit } from '../core/AuditService.js';

/**
 * Fetch all app registrations for a team
 * @param teamId The team ID to filter by
 */
export async function getAppRegistrations(teamId?: string) {
    const queryParams: any[] = [];
    let whereClause = '';

    if (teamId) {
        whereClause = 'WHERE owner_team_id = $1';
        queryParams.push(teamId);
    }

    const res = await query(`
        SELECT * FROM app_registrations 
        ${whereClause}
        ORDER BY created_at DESC
    `, queryParams);

    return res.rows.map(row => ({
        ...row,
        displayName: row.display_name,
        clientId: row.client_id,
        appIdUri: row.app_id_uri,
        secretExpiryDate: row.secret_expiry_date,
        productId: row.product_id,
        ownerTeamId: row.owner_team_id
    }));
}

/**
 * Link a new app registration
 */
export async function addAppRegistration(app: {
    displayName: string,
    clientId: string,
    environment: string,
    ownerTeamId: string,
    appIdUri?: string,
    secretExpiryDate?: string,
    productId?: string
}) {
    const id = `app-${Math.random().toString(36).substr(2, 9)}`;
    const res = await query(`
        INSERT INTO app_registrations (
            id, display_name, client_id, environment, owner_team_id, app_id_uri, secret_expiry_date, product_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `, [
        id, app.displayName, app.clientId, app.environment, app.ownerTeamId, app.appIdUri, app.secretExpiryDate, app.productId
    ]);

    // 3. Log Audit
    await logAudit({
        entityType: 'APP_REGISTRATION',
        entityId: id,
        action: 'LINK_APP',
        userId: 'system-user',
        changes: app
    });

    return {
        ...res.rows[0],
        displayName: res.rows[0].display_name,
        clientId: res.rows[0].client_id,
        appIdUri: res.rows[0].app_id_uri,
        secretExpiryDate: res.rows[0].secret_expiry_date,
        productId: res.rows[0].product_id,
        ownerTeamId: res.rows[0].owner_team_id
    };
}
