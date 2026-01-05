/**
 * @fileoverview Credential Service
 * 
 * Securely handles on-demand fetching of subscription keys from APIM.
 */

import { query } from './db.js';
import { getArmService } from './apim.service.js';

export interface SubscriptionSecrets {
    primaryKey: string;
    secondaryKey: string;
}

/**
 * Fetch subscription secrets from Azure APIM
 * 
 * RBAC:
 * - User must be the subscriber (subscriber_team_id match)
 * - OR User must be an owner of the parent Product
 */
export async function getSubscriptionSecrets(
    subscriptionId: string,
    userTeams: string[],
    userRole: string = 'user'
): Promise<SubscriptionSecrets> {

    // 1. Fetch Subscription and Product info from DB
    const subRes = await query(`
        SELECT s.*, p.owner_team_id, p.environment
        FROM subscriptions s
        JOIN products p ON s.product_id = p.id
        WHERE s.id = $1
    `, [subscriptionId]);

    if (subRes.rows.length === 0) {
        throw new Error('Subscription not found');
    }

    const sub = subRes.rows[0];

    // 2. Validate Authorization
    let isAuthorized = userRole === 'admin';

    if (!isAuthorized) {
        // Option A: Subscriber Team match
        if (userTeams.includes(sub.subscriber_team_id)) {
            isAuthorized = true;
        }

        // Option B: Product Owner match
        if (sub.owner_team_id && userTeams.includes(sub.owner_team_id)) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        throw new Error('Unauthorized to view secrets for this subscription');
    }

    // 3. Fetch from Azure APIM
    try {
        const arm = await getArmService(sub.environment);
        const secrets = await arm.listSubscriptionSecrets(subscriptionId);

        return {
            primaryKey: secrets.primaryKey,
            secondaryKey: secrets.secondaryKey
        };
    } catch (err) {
        console.error(`Failed to fetch secrets from APIM:`, err);
        throw new Error('Failed to retrieve secrets from Azure APIM');
    }
}
