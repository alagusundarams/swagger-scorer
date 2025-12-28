/**
 * Discovery - API Client
 * 
 * API calls for API discovery operations.
 * 
 * @module features/discovery/api
 */

import { api } from '../../../api/baseClient';

/**
 * Search APIs
 */
export async function searchAPIs(query: string) {
    return api.get('/apis/search', { params: { q: query } });
}
