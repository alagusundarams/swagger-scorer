/**
 * Admin - API Client
 * 
 * API calls for admin operations.
 * 
 * @module features/admin/api
 */

import { api } from '../../../api/baseClient';

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
