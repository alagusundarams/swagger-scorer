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
    // TODO: Replace with actual API call
    // const updatedTeam = await api.patch(`/admin/teams/${teamId}`, updates);

    console.warn('[adminClient.updateTeam] Not implemented - emitting event with mock data');
    const mockUpdatedTeam = { id: teamId, ...updates } as Team;

    // Emit event to refresh AppDataContext
    eventBus.emit('team:updated', {
        teamId,
        team: mockUpdatedTeam
    });

    return mockUpdatedTeam;
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
    // TODO: Replace with actual API call
    // const updatedProduct = await api.patch(`/admin/products/${productId}`, updates);

    console.warn('[adminClient.updateProduct] Not implemented - emitting event with mock data');
    const mockUpdatedProduct = { id: productId, ...updates } as Product;

    // Emit event to refresh relevant data
    eventBus.emit('product:updated', {
        productId,
        product: mockUpdatedProduct
    });

    return mockUpdatedProduct;
}
