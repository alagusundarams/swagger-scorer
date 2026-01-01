/**
 * Policy Studio API Client
 * 
 * Centralized API calls for policy-related operations.
 * Follows MFE (Micro Frontend) architecture principles.
 * 
 * @module features/policy-studio/api
 */

/**
 * ------------------------------------------------------------------
 * 📍 API Client: Policy Studio (Persistence)
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Communication gateway for fetching and saving APIM policies.
 * - Handles the ingestion of Policy Templates (JSON) from the server.
 * - Manages the "Live Sync" of policy changes during the editing session.
 * ------------------------------------------------------------------
 */
import { api } from '../../../api/baseClient';

/**
 * Policy template field definition
 */
export interface PolicyField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea' | 'array';
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    defaultValue?: unknown;
}

/**
 * Policy template from backend
 */
export interface PolicyTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    section: string;
    templateSchema: {
        fields: PolicyField[];
        xmlTemplate: string;
    };
}

/**
 * Policy element display structure (from backend parsing)
 */
export interface PolicyElementDisplay {
    id: string;
    type: string;
    displayName: string;
    icon: string;
    attributes: Array<{ key: string; value: string }>;
    snippet?: string;
}

/**
 * Policy section display structure
 */
export interface PolicySectionDisplay {
    name: string;
    policies: PolicyElementDisplay[];
}

/**
 * Complete policy display structure
 */
export interface PolicyDisplayStructure {
    gatewayType: string;
    originalPolicy: string;
    sections: PolicySectionDisplay[];
}

/**
 * Fetch parsed policy display structure for a product
 * 
 * @param productId - Product ID
 * @returns Promise with display structure
 */
export async function getPolicyDisplay(productId: string) {
    return api.get<{ success: boolean; displayStructure: PolicyDisplayStructure }>(
        `/products/${productId}/policy-display`
    );
}

/**
 * Fetch policy templates filtered by section
 * 
 * @param section - Policy section (inbound, backend, outbound, on-error)
 * @returns Promise with templates array
 */
export async function getPolicyTemplatesBySection(section: string) {
    return api.get<{ success: boolean; templates: PolicyTemplate[] }>(
        `/policy/templates/by-section`,
        { params: { section } }
    );
}

/**
 * Generate policy XML from template and values
 * 
 * @param templateId - Template ID
 * @param values - Form values to populate template
 * @returns Promise with generated XML
 */
export async function generatePolicyXml(templateId: string, values: Record<string, unknown>) {
    return api.post<{ success: boolean; xml: string }>(
        '/policy/templates/generate',
        { templateId, values }
    );
}
