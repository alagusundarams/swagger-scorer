/**
 * Provisioning - API Client
 * 
 * API calls for provisioning operations.
 * 
 * @module features/provisioning/api
 */

/**
 * ------------------------------------------------------------------
 * 📍 API Client: Provisioning (Project Creation)
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Direct communication with the APIM Provisioning service.
 * - Triggers the creation of Git repositories and AD resource groups.
 * - Handles the final submission of the onboarding payload.
 * ------------------------------------------------------------------
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
