/**
 * Auth - API Client
 * 
 * API calls for authentication operations.
 * 
 * @module features/auth/api
 */

import { api } from '../../../api/baseClient';

/**
 * Login API call (placeholder)
 */
export async function login(credentials: { email: string; password: string }) {
    return api.post('/auth/login', credentials);
}

/**
 * Logout API call (placeholder)
 */
export async function logout() {
    return api.post('/auth/logout');
}

/**
 * Get current user
 */
export async function getCurrentUser() {
    return api.get('/auth/me');
}
