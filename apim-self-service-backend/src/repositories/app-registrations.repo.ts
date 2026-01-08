import { query } from '../services/core/db.js';

/**
 * AppRegistrationsRepository
 * 
 * Handles all database operations for Azure AD App Registrations linked to APIM resources.
 */
export class AppRegistrationsRepository {
    /**
     * Get all app registrations for a product
     */
    async getAppRegistrationsForProduct(productId: string) {
        return await query(
            'SELECT * FROM app_registrations WHERE product_id = $1',
            [productId]
        );
    }

    /**
     * Get app registration by Client ID
     */
    async getAppRegistrationByClientId(clientId: string) {
        return await query(
            'SELECT * FROM app_registrations WHERE client_id = $1',
            [clientId]
        );
    }

    /**
     * Create a new App Registration
     */
    async createAppRegistration(data: {
        id: string;
        clientId: string;
        displayName: string;
        appIdUri: string;
        environment: string;
        ownerTeamId: string;
        productId?: string;
        apiId?: string;
        type: 'PRODUCT' | 'API';
    }) {
        return await query(`
            INSERT INTO app_registrations (
                id, client_id, display_name, app_id_uri, environment, owner_team_id, product_id, api_id, type, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *
        `, [
            data.id, data.clientId, data.displayName, data.appIdUri, data.environment,
            data.ownerTeamId, data.productId, data.apiId, data.type
        ]);
    }

    /**
     * Get app registrations owned by a specific team
     */
    async getAppRegistrationsForTeam(teamId: string) {
        return await query(
            'SELECT * FROM app_registrations WHERE owner_team_id = $1',
            [teamId]
        );
    }

    /**
     * Search available app registrations by name or ID
     */
    async searchAppRegistrations(searchTerm: string) {
        const pattern = `%${searchTerm}%`;
        return await query(`
            SELECT DISTINCT display_name, client_id, app_id_uri 
            FROM app_registrations 
            WHERE display_name ILIKE $1 
               OR client_id ILIKE $1 
               OR app_id_uri ILIKE $1
            LIMIT 20
        `, [pattern]);
    }

    /**
     * Get orphaned app registrations (not linked to product or API)
     */
    async getOrphanAppRegistrations(environment: string) {
        return await query(`
            SELECT * FROM app_registrations 
            WHERE product_id IS NULL 
              AND api_id IS NULL 
              AND environment = $1
            ORDER BY display_name ASC
        `, [environment]);
    }

    /**
     * Adopt an orphaned app registration
     */
    async adoptAppRegistration(id: string, productId?: string, apiId?: string) {
        return await query(`
            UPDATE app_registrations 
            SET product_id = $1, 
                api_id = $2, 
                updated_at = NOW() 
            WHERE id = $3 
            RETURNING *
        `, [productId, apiId, id]);
    }
}
