/**
 * Admin Validation API
 * 
 * API calls for admin-specific validation
 */

import { api } from '../../../api/baseClient';

export interface ValidationResult {
    isValid: boolean;
    isDuplicate: boolean;
    conflicts: Array<{
        id: string;
        name: string;
        [key: string]: any;
    }>;
    message: string;
}

/**
 * Validate named value key for duplicates
 */
export async function validateNamedValueKey(
    key: string,
    environment: string
): Promise<ValidationResult> {
    const response = await api.post('/validate/named-value-key', {
        key,
        environment
    });
    return response.data;
}

/**
 * Validate backend ID for duplicates
 */
export async function validateBackendId(
    backendId: string,
    environment: string
): Promise<ValidationResult> {
    const response = await api.post('/validate/backend-id', {
        backendId,
        environment
    });
    return response.data;
}
