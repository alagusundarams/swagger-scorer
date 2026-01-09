/**
 * @fileoverview Apps Service
 * 
 * Handles management of App Registrations (Linked Client IDs)
 */

import { query } from '../core/db.js';
import { logAudit } from '../core/AuditService.js';
// import { AppRegistrationsRepository } from '../../repositories/app-registrations.repo.js';
import { AzureService } from '../core/AzureService.js';
import { v4 as uuidv4 } from 'uuid';

// const appsRepo = new AppRegistrationsRepository();

/**
 * Search all available app registrations
 */
/**
 * Search all available app registrations (Live Azure Search)
 */
export async function searchApps(query: string) {
    // We search Azure directly to find identities even if they aren't in our DB yet.
    return await AzureService.searchAppRegistrations(query);
}

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
    productId?: string
}) {
    // 1. Validate against Azure to get latest metadata (read-only source of truth)
    const azureApp = await AzureService.validateAppRegistration(app.clientId);
    const secretExpiryDate = azureApp?.secretExpiryDate || null;
    const displayName = azureApp?.displayName || app.displayName;

    const id = `app-${Math.random().toString(36).substr(2, 9)}`;
    const res = await query(`
        INSERT INTO app_registrations (
            id, display_name, client_id, environment, owner_team_id, app_id_uri, secret_expiry_date, product_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
    `, [
        id, displayName, app.clientId, app.environment, app.ownerTeamId, app.appIdUri, secretExpiryDate, app.productId
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

/**
 * STRICT Link App Registration with Azure Validation
 * This is the primary method for "Manual Selection" workflow.
 */
export async function linkAppRegistration(
    sourceProductId: string,
    environment: string,
    identityData: { clientId: string, displayName: string },
    userId: string
) {
    const { clientId, displayName } = identityData;

    // 1. Validate against Azure (Trust but Verify)
    const azureApp = await AzureService.validateAppRegistration(clientId);

    if (!azureApp) {
        throw new Error(`Identity '${clientId}' not found in Azure. Please verify the Client ID.`);
    }

    // 2. Resolve Target Product ID & Ensure Stub Exists
    const productRes = await query('SELECT * FROM products WHERE id = $1', [sourceProductId]);
    if (productRes.rows.length === 0) throw new Error(`Product ${sourceProductId} not found`);
    const sp = productRes.rows[0];

    const targetProductId = `${sp.name}:${environment}:${sp.region}`;

    // Ensure Target Product Exists (Stub) to satisfy FK
    await query(`
        INSERT INTO products (
            id, name, display_name, environment, region, state, 
            owner_team_id, type, visibility, management_mode
        ) VALUES (
            $1, $2, $3, $4, $5, 'notPublished', 
            $6, $7, $8, 'TERRAFORM_MANAGED'
        )
        ON CONFLICT (id) DO NOTHING
    `, [
        targetProductId, sp.name, sp.display_name, environment, sp.region,
        sp.owner_team_id, sp.type, sp.visibility
    ]);

    // 3. Perform Link (Upsert) to TARGET Product ID
    const id = `app-${uuidv4()}`;
    const res = await query(`
        INSERT INTO app_registrations (
            id, client_id, display_name, environment, product_id, type, secret_expiry_date
        ) VALUES ($1, $2, $3, $4, $5, 'PRODUCT', $6)
        ON CONFLICT (client_id) DO UPDATE SET
            product_id = EXCLUDED.product_id,
            environment = EXCLUDED.environment,
            display_name = EXCLUDED.display_name,
            secret_expiry_date = EXCLUDED.secret_expiry_date,
            updated_at = NOW()
        RETURNING *
    `, [id, clientId, azureApp.displayName || displayName, environment, targetProductId, azureApp.secretExpiryDate]);

    const linkedApp = res.rows[0];

    // 4. Audit Log
    await logAudit({
        entityType: 'APP_REGISTRATION',
        entityId: linkedApp.id,
        action: 'LINK_IDENTITY',
        userId: userId,
        resourceId: targetProductId,
        resourceType: 'product',
        details: {
            environment,
            clientId,
            method: 'MANUAL_LINK_VERIFIED',
            sourceProductId
        }
    });

    return {
        id: linkedApp.id,
        clientId: linkedApp.client_id,
        displayName: linkedApp.display_name,
        environment: linkedApp.environment,
        productId: linkedApp.product_id,
        secretExpiryDate: linkedApp.secret_expiry_date
    };
}
