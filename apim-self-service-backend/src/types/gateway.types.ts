/**
 * Gateway Types - Universal Interface
 * 
 * Gateway-agnostic types for UI rendering
 * Does NOT convert policy format - keeps XML/config as-is
 */

/**
 * Display metadata extracted from policy
 * UI uses this for rendering, not the raw XML
 */
export interface PolicyDisplayStructure {
    gatewayType: 'apim' | 'kong' | 'aws' | 'apigee';
    originalPolicy: string;  // Keep XML/config as-is
    sections: PolicySectionDisplay[];
}

export interface PolicySectionDisplay {
    name: string;  // 'inbound', 'backend', 'outbound', 'on-error' (APIM) or equivalent
    policies: PolicyElementDisplay[];
}

export interface PolicyElementDisplay {
    id: string;  // Generated ID for React keys
    type: string;  // 'rate-limit', 'cors', etc.
    displayName: string;  // Formatted name for UI
    icon: string;  // Icon identifier
    attributes: Array<{ key: string; value: string }>;  // For display only
    snippet?: string;  // Short preview
}

/**
 * Gateway service interface
 * Each gateway implements this
 */
export interface IGatewayService {
    /**
     * Parse gateway policy to display structure
     * Input: Raw policy (XML for APIM, JSON for Kong, etc.)
     * Output: Minimal display metadata
     */
    parseToDisplayStructure(rawPolicy: string): PolicyDisplayStructure;

    /**
     * Validate policy syntax
     */
    validatePolicy(rawPolicy: string): { valid: boolean; errors?: string[] };

    /**
     * Get policy templates for this gateway
     */
    getTemplates(): any[];  // Gateway-specific templates
}
