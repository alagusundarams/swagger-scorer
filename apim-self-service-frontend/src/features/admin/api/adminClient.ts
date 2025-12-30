/**
 * Admin - API Client
 * 
 * API calls for admin operations following MFE principles.
 * All mutations emit events to refresh shared context.
 * 
 * @module features/admin/api
 */

import { api } from '../../../api/baseClient';
import type { Team, Product } from '../../../shared/types/domain';
import { eventBus } from '../../../shared/events/eventBus';

/**
 * Get admin dashboard data
 */
export async function getAdminDashboard() {
    return api.get('/admin/dashboard');
}

/**
 * Get global inventory
 */
export async function getGlobalInventory() {
    return api.get('/admin/inventory');
}

/**
 * Update an existing team
 * 
 * @param teamId - ID of team to update
 * @param updates - Partial team object with fields to update
 * @returns Updated team
 * 
 * @emits team:updated - After successful update
 * 
 * @todo Implement actual API endpoint
 */
export async function updateTeam(teamId: string, updates: Partial<Team>): Promise<Team> {
    const response = await fetch(`/api/v1/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    });
    const updatedTeam = await response.json();

    // Emit event to refresh AppDataContext
    eventBus.emit('team:updated', {
        teamId,
        team: updatedTeam
    });

    // Also emit generic refresh for components listening for dataType
    eventBus.emit('data:refresh', { dataType: 'teams' });

    return updatedTeam;
}

/**
 * Get orphaned products (products without valid owner teams)
 * 
 * @returns Array of products that need team assignment
 * 
 * @todo Implement actual API endpoint
 */
export async function getOrphanProducts(): Promise<Product[]> {
    // TODO: Replace with actual API call
    // return api.get('/admin/products/orphaned');

    console.warn('[adminClient.getOrphanProducts] Not implemented - returning empty array');
    return [];
}

/**
 * Assign a product to a team (used for orphan management)
 * 
 * @param productId - ID of product to update
 * @param updates - Product updates (typically ownerTeamId and ownerAdGroupId)
 * @returns Updated product
 * 
 * @emits product:updated - After successful update
 * 
 * @todo Implement actual API endpoint
 */
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<Product> {
    console.log(`[adminClient] updateProduct called for ${productId}`, updates);
    try {
        const response = await fetch(`/api/v1/products/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const errBody = await response.text();
            console.error(`[adminClient] updateProduct failed with ${response.status}: ${errBody}`);
            throw new Error(`Failed to update product: ${response.status}`);
        }
        const updatedProduct = await response.json();
        console.log(`[adminClient] updateProduct success for ${productId}`);

        // Emit event to refresh relevant data
        eventBus.emit('product:updated', {
            productId,
            product: updatedProduct
        });

        // Also emit generic refresh for components listening for dataType (like OrphanManager)
        eventBus.emit('data:refresh', { dataType: 'products' });

        return updatedProduct;
    } catch (err) {
        console.error(`[adminClient] updateProduct error:`, err);
        throw err;
    }
}
