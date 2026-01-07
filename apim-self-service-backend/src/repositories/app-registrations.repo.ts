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
     * Get app registrations owned by a specific team
     */
    async getAppRegistrationsForTeam(teamId: string) {
        return await query(
            'SELECT * FROM app_registrations WHERE owner_team_id = $1',
            [teamId]
        );
    }
}
