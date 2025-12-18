import type { Product, User } from '../types/entities';

/**
 * Product Role Type
 * Determines what view of the product the user should see
 */
export type ProductRole = 'producer' | 'consumer' | 'sales';

/**
 * Determine user's role for a given product
 * 
 * Logic:
 * - Producer: User's team owns the product
 * - Consumer: User's team subscribes to the product (or discovering)
 * - Sales: User is in sales team or has sales role  
 * - Default: Consumer (discovery mode)
 */
export const getUserRoleForProduct = (product: Product, user: User | null): ProductRole => {
    if (!user) {
        return 'consumer'; // Default for unauthenticated users
    }

    // Producer: User's team owns this product
    if (user.teams.includes(product.ownerTeamId)) {
        return 'producer';
    }

    // Sales: User is in sales team
    // Note: Adjust team ID based on actual sales team identifier
    if (user.teams.includes('team-sales')) {
        return 'sales';
    }

    // Consumer: Default view for subscription or discovery
    // Note: Actual subscription status can be checked separately
    return 'consumer';
};

/**
 * Check if user has management permissions for a product
 * Used to show/hide admin controls
 */
export const canManageProduct = (product: Product, user: User | null): boolean => {
    if (!user) return false;
    return user.teams.includes(product.ownerTeamId);
};

/**
 * Check if user is authorized to access a product
 * Based on visibility and authorized teams
 */
export const canAccessProduct = (product: Product, user: User | null): boolean => {
    if (!user) return product.visibility === 'public';

    // Public products accessible to all
    if (product.visibility === 'public') return true;

    // Owner always has access
    if (user.teams.includes(product.ownerTeamId)) return true;

    // Check authorized teams list
    if (product.authorizedTeams && product.authorizedTeams.some(teamId => user.teams.includes(teamId))) {
        return true;
    }

    return false;
};
