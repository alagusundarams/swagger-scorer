/**
 * Provisioning - API Client
 * 
 * API calls for provisioning operations.
 * 
 * @module features/provisioning/api
 */

import { api } from '../../../api/baseClient';

/**
 * Create new product
 */
export async function createProduct(data: any) {
    return api.post('/products', data);
}

/**
 * Onboard API
 */
export async function onboardAPI(data: any) {
    return api.post('/apis', data);
}
