/**
 * Inventory Validation API
 * 
 * API calls for inventory-specific validation
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
