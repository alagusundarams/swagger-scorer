import { query } from '../services/core/db.js';

/**
 * SubscriptionsRepository
 * 
 * Handles all database operations for APIM Subscriptions.
 */
export class SubscriptionsRepository {
    /**
     * Get all active subscriptions for a product
     */
    async getSubscriptionsForProduct(productId: string) {
        return await query(`
            SELECT s.*, t.name as team_name, ar.display_name as app_display_name
            FROM subscriptions s
            LEFT JOIN teams t ON s.subscriber_team_id = t.id
            LEFT JOIN app_registrations ar ON s.app_registration_id = ar.id
            WHERE s.product_id = $1 AND s.state = 'active'
        `, [productId]);
    }

    /**
     * Get all subscriptions for a specific team
     */
    async getSubscriptionsForTeam(teamId: string) {
        return await query(`
            SELECT s.*, p.display_name as product_name
            FROM subscriptions s
            JOIN products p ON s.product_id = p.id
            WHERE s.subscriber_team_id = $1
        `, [teamId]);
    }

    /**
     * Get a specific subscription by ID
     */
    async getSubscriptionById(id: string) {
        return await query('SELECT * FROM subscriptions WHERE id = $1', [id]);
    }
}
