/**
 * ResourcePaths Utility
 * 
 * Centralizes the folder structure conventions for Product and API artifacts.
 * Used for both Git and Blob Storage discovery.
 */

export class ResourcePaths {
    /**
     * Get the root folder for a product
     */
    static productRoot(productName: string): string {
        return productName;
    }

    /**
     * Get the path for the product-level policy
     */
    static productPolicy(productName: string): string {
        return `${productName}/policy/product-policy.xml`;
    }

    /**
     * Get the path for an API-level policy (Base)
     */
    static apiPolicyBase(productName: string, apiName: string): string {
        return `${productName}/policy/api/${apiName}/api-policy.xml`;
    }

    /**
     * Get the path for an API-level policy (Environment Specific)
     */
    static apiPolicyEnv(productName: string, apiName: string, environment: string): string {
        return `${productName}/policy/api/${apiName}/api-policy_${environment}.xml`;
    }

    /**
     * Get the path for an API contract (Swagger/OpenAPI)
     * Note: Extension can be .json or .yaml, defaults to .json
     */
    static apiContract(productName: string, apiName: string, extension: 'json' | 'yaml' = 'json'): string {
        return `${productName}/api/${apiName}/contract.${extension}`;
    }

    /**
     * Get the path for environment-specific configuration (Named Values)
     */
    static namedValues(productName: string, environment: string): string {
        return `${productName}/config/${environment.toLowerCase()}/named-values.json`;
    }

    /**
     * Get the path for environment-specific configuration (Backends)
     */
    static backends(productName: string, environment: string): string {
        return `${productName}/config/${environment.toLowerCase()}/backends.json`;
    }
}
