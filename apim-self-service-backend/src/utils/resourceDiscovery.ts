/**
 * ResourceDiscovery Utility
 * 
 * Implements discovery logic for finding policy and contract files
 * across Standard and GRP product structures.
 */

export interface DiscoveryResult {
    path: string | null;
    source: 'GIT' | 'BLOB' | 'APIM';
    readOnly: boolean;
    warning?: string;
}

export class ResourceDiscovery {
    /**
     * Resolve the path for a Product Policy
     * Patterns:
     * 1. Policy/Product/[product-name]_[env].xml (Env Override)
     * 2. Policy/Product/[product-name].xml (Base)
     */
    static resolveProductPolicyPath(fileList: string[], productName: string, environment?: string): string | null {
        if (environment) {
            const envPath = `Policy/Product/${productName}_${environment.toUpperCase()}.xml`.toLowerCase();
            const match = fileList.find(f => f.toLowerCase() === envPath);
            if (match) return match;
        }

        const basePath = `Policy/Product/${productName}.xml`.toLowerCase();
        return fileList.find(f => f.toLowerCase() === basePath) || null;
    }

    /**
     * Resolve the path for an API Policy
     * Patterns:
     * 1. Policy/API/[api-name]/[api-name].xml (Standard)
     * 2. Fallback to Product Policy if API policy not found? No, usually separate.
     */
    static resolveApiPolicyPath(fileList: string[], _productName: string, apiName: string): string | null {
        const path = `Policy/API/${apiName}/${apiName}.xml`.toLowerCase();
        return fileList.find(f => f.toLowerCase() === path) || null;
    }

    /**
     * Resolve the path for an API Contract (Swagger/OpenAPI)
     * Patterns:
     * 1. API/[api-name]/[api-name].json
     * 2. API/[api-name]/[api-name].yaml
     * 
     * EDGE CASE: If multiple contracts are found in the API folder,
     * we return null to trigger a fallback to APIM (Source of Truth).
     */
    static resolveContractPath(fileList: string[], _productName: string, apiName: string): string | null {
        const apiDir = `API/${apiName}/`.toLowerCase();
        const matches = fileList.filter(f =>
            f.toLowerCase().startsWith(apiDir) &&
            (f.toLowerCase().endsWith('.json') || f.toLowerCase().endsWith('.yaml'))
        );

        if (matches.length > 1) {
            console.warn(`[ResourceDiscovery] Multiple contracts found for ${apiName}. Falling back to APIM.`);
            return null;
        }

        return matches[0] || null;
    }

    /**
     * Default paths for NEW files (Onboarding)
     */
    static getDefaultProductPolicyPath(productName: string): string {
        return `Policy/Product/${productName}.xml`;
    }

    static getDefaultApiPolicyPath(apiName: string): string {
        return `Policy/API/${apiName}/${apiName}.xml`;
    }

    static getDefaultContractPath(apiName: string): string {
        return `API/${apiName}/${apiName}.json`;
    }
}
