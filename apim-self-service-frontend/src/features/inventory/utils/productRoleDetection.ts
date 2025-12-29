/**
 * Product Role Detection Utility
 * 
 * **Purpose**: Determine user's role and permissions for a specific product.
 * 
 * @module productRoleDetection
 */

import type { Product, User, Environment } from '../../../types/entities';
import type { Team } from '../../teams/types/teamTypes';

/**
 * User's role in relation to a specific product
 */
export type ProductRole = 'producer' | 'consumer' | 'sales';

/**
 * Get user's role for a specific product
 */
export function getUserRoleForProduct(
    product: Product,
    user: User | null
): ProductRole {
    if (!user) {
        return 'consumer';
    }

    if (user.role === 'admin') {
        return 'producer';
    }

    if (user.teams.includes(product.ownerTeamId)) {
        return 'producer';
    }

    if (user.teams.includes('team-sales')) {
        return 'sales';
    }

    return 'consumer';
}

/**
 * Check if user can manage a product
 */
export function canManageProduct(
    product: Product,
    user: User | null
): boolean {
    if (!user) {
        return false;
    }
    return getUserRoleForProduct(product, user) === 'producer';
}

/**
 * Check if user can access a product
 */
export function canAccessProduct(
    product: Product,
    user: User | null
): boolean {
    if (product.visibility === 'public') {
        return true;
    }

    if (!user) {
        return false;
    }

    if (user.role === 'admin') {
        return true;
    }

    if (user.teams.includes(product.ownerTeamId)) {
        return true;
    }

    if (product.visibility === 'owner-only') {
        return false;
    }

    if (product.visibility === 'private') {
        const authorizedTeams = product.authorizedTeams || [];
        return user.teams.some(teamId => authorizedTeams.includes(teamId));
    }

    return true;
}

/**
 * Filter products based on user's access rights
 */
export function filterAccessibleProducts(
    products: Product[],
    user: User | null
): Product[] {
    return products.filter(product =>
        canAccessProduct(product, user)
    );
}

/**
 * Get accessible environments for a user within a team context
 */
export function getAccessibleEnvironments(
    user: User | null,
    team: Team | null
): Environment[] {
    if (!user) return [];

    if (user.role === 'admin') {
        return ['ALL', 'DEV', 'QA', 'STAGE', 'PROD'];
    }

    if (!team) {
        return ['DEV', 'QA'];
    }

    if (user.leadsTeams.includes(team.id)) {
        return ['ALL', 'DEV', 'QA', 'STAGE', 'PROD'];
    }

    if (team.adGroupMapping && user.adGroups) {
        const allowed: Environment[] = ['DEV', 'QA'];

        if (team.adGroupMapping.STAGE && user.adGroups.includes(team.adGroupMapping.STAGE)) {
            allowed.push('STAGE');
        }
        if (team.adGroupMapping.PROD && user.adGroups.includes(team.adGroupMapping.PROD)) {
            allowed.push('PROD');
        }

        if (allowed.includes('STAGE') || allowed.includes('PROD')) {
            allowed.unshift('ALL');
        } else {
            allowed.unshift('ALL');
        }

        const standardOrder: Environment[] = ['ALL', 'DEV', 'QA', 'STAGE', 'PROD'];
        return standardOrder.filter(e => allowed.includes(e));
    }

    return ['ALL', 'DEV', 'QA'];
}
