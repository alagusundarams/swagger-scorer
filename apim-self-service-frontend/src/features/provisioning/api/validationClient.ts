/**
 * Provisioning Validation API
 * 
 * API calls for provisioning-specific validation
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
 * Validate API path for duplicates
 */
export async function validateApiPath(
    path: string,
    environment: string,
    excludeApiId?: string
): Promise<ValidationResult> {
    const response = await api.post('/validate/api-path', {
        path,
        environment,
        excludeApiId
    });
    return response.data;
}
