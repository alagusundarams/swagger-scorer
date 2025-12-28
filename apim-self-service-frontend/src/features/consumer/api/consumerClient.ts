/**
 * Consumer - API Client
 * 
 * API calls for consumer operations.
 * 
 * @module features/consumer/api
 */

import { api } from '../../../api/baseClient';

/**
 * Browse marketplace
 */
export async function browseMarketplace() {
    return api.get('/marketplace');
}
