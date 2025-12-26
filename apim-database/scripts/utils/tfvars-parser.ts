/**
 * @fileoverview Terraform tfvars Parser
 * 
 * Parses terraform_<env>.tfvars files to extract API and product mappings
 */

import { readFileSync } from 'fs';
import { parseToObject } from 'hcl2-parser';

export interface TfvarsAPI {
    name: string;
    revision?: string;
    path?: string;
    specification_format?: string;
    api_spec_path?: string;
    api_specification_file?: string;
    api_policy_path?: string;
    api_policy_file?: string;
    api_version?: string;
    version_set_id?: string;
}

export interface TfvarsProduct {
    name: string;
    api_name?: string[];
    product_policy?: string;
    product_policy_path?: string;
}

export interface TfvarsData {
    api_version_sets?: Array<{
        version_set_name: string;
        versioning_scheme: string;
    }>;
    apis?: TfvarsAPI[];
    products?: TfvarsProduct[];
    subscriptions?: Array<{
        product_name: string;
        subscription_display_name: string;
        state: string;
        allow_tracing?: boolean;
        api_name?: string;
    }>;
    named_value?: Array<{
        named_value_name: string;
        value_to_be_stored?: string;
        named_value_display_name?: string;
        keyvault_secret_name?: string;
        is_it_secret?: boolean;
    }>;
    api_backends?: Array<{
        backend_name: string;
        backend_url: string;
    }>;
}

/**
 * Parse a tfvars file
 */
export function parseTfvars(filePath: string): TfvarsData {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const parsed = parseToObject(content);

        // Extract arrays from parsed HCL
        return {
            api_version_sets: parsed.api_version_sets || [],
            apis: parsed.apis || [],
            products: parsed.products || [],
            subscriptions: parsed.subscriptions || [],
            named_value: parsed.named_value || [],
            api_backends: parsed.api_backends || []
        };
    } catch (err) {
        console.warn(`⚠️  Failed to parse tfvars file ${filePath}:`, err instanceof Error ? err.message : String(err));
        return {};
    }
}

/**
 * Find API in tfvars by name
 */
export function findAPIInTfvars(apiName: string, tfvars: TfvarsData): TfvarsAPI | null {
    if (!tfvars.apis) return null;
    return tfvars.apis.find(a => a.name === apiName) || null;
}

/**
 * Find product in tfvars by name
 */
export function findProductInTfvars(productName: string, tfvars: TfvarsData): TfvarsProduct | null {
    if (!tfvars.products) return null;
    return tfvars.products.find(p => p.name === productName) || null;
}

/**
 * Get full contract path for an API
 */
export function getAPIContractPath(api: TfvarsAPI): string | null {
    if (api.api_spec_path && api.api_specification_file) {
        return `${api.api_spec_path}${api.api_specification_file}`;
    }
    return null;
}

/**
 * Get full policy path for an API
 */
export function getAPIPolicyPath(api: TfvarsAPI): string | null {
    if (api.api_policy_path && api.api_policy_file) {
        return `${api.api_policy_path}${api.api_policy_file}`;
    }
    return null;
}

/**
 * Get full policy path for a product
 */
export function getProductPolicyPath(product: TfvarsProduct): string | null {
    if (product.product_policy_path && product.product_policy) {
        return `${product.product_policy_path}${product.product_policy}`;
    }
    return null;
}

/**
 * Get APIs for a product
 */
export function getAPIsForProduct(product: TfvarsProduct, tfvars: TfvarsData): TfvarsAPI[] {
    if (!product.api_name || !tfvars.apis) return [];

    return product.api_name
        .map(apiName => findAPIInTfvars(apiName, tfvars))
        .filter(api => api !== null) as TfvarsAPI[];
}
/**
 * Find the line number of a specific named block in a tfvars file
 */
export function findLineNumber(filePath: string, searchName: string): number | null {
    try {
        const content = readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        // Search for lines like 'name = "searchName"' or 'name="searchName"'
        const regex = new RegExp(`name\\s*=\\s*["']${searchName}["']`);

        for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
                return i + 1; // 1-indexed
            }
        }
    } catch (err) {
        // Ignore errors
    }
    return null;
}
