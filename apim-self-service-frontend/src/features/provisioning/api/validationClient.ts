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
 * Validate Product name for duplicates
 */
export async function validateProductName(
    name: string,
    environment: string
): Promise<ValidationResult> {
    const response = await api.post('/validate/product-name', {
        name,
        environment
    });
    return response.data;
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
