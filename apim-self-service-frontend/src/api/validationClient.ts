/**
 * @fileoverview Validation API Client
 * 
 * API functions for duplicate detection and validation
 */

import { api } from './baseClient';

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

/**
 * Validate product name for duplicates
 */
export async function validateProductName(
    name: string,
    environment: string,
    excludeProductId?: string
): Promise<ValidationResult> {
    const response = await api.post('/validate/product-name', {
        name,
        environment,
        excludeProductId
    });
    return response.data;
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

/**
 * Batch validate multiple fields at once
 */
export async function validateBatch(
    validations: Array<{
        type: 'api-path' | 'product-name' | 'named-value-key' | 'backend-id';
        [key: string]: any;
    }>
): Promise<{
    isValid: boolean;
    results: Array<ValidationResult & { type: string }>;
}> {
    const response = await api.post('/validate/batch', {
        validations
    });
    return response.data;
}
