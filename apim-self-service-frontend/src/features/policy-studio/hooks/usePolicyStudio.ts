/**
 * Policy Studio Custom Hooks
 * 
 * React hooks for policy-related data fetching and state management.
 * Follows MFE (Micro Frontend) architecture principles.
 * 
 * @module features/policy-studio/hooks
 */

import { useState, useEffect } from 'react';
import {
    getPolicyDisplay,
    getPolicyTemplatesBySection,
    generatePolicyXml,
    type PolicyDisplayStructure,
    type PolicyTemplate
} from '../api/policyClient';

/**
 * Hook to fetch and manage policy display structure
 * 
 * @param productId - Product ID to fetch policy for
 * @returns Display structure, loading state, and error
 */
export function usePolicyDisplay(productId: string) {
    const [displayStructure, setDisplayStructure] = useState<PolicyDisplayStructure | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        getPolicyDisplay(productId)
            .then((response) => {
                if (mounted && response.data.success) {
                    setDisplayStructure(response.data.displayStructure);
                }
            })
            .catch((err: Error) => {
                if (mounted) {
                    setError(err.message || 'Failed to load policy');
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [productId]);

    return { displayStructure, loading, error };
}

/**
 * Hook to fetch policy templates for a specific section
 * 
 * @param section - Policy section (inbound, backend, outbound, on-error)
 * @returns Templates array, loading state, and error
 */
export function usePolicyTemplates(section: string) {
    const [templates, setTemplates] = useState<PolicyTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        getPolicyTemplatesBySection(section)
            .then((response) => {
                if (mounted && response.data.success) {
                    setTemplates(response.data.templates);
                }
            })
            .catch((err: Error) => {
                if (mounted) {
                    setError(err.message || 'Failed to load templates');
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [section]);

    return { templates, loading, error };
}

/**
 * Hook to generate policy XML from template
 * 
 * @returns Generate function, loading state, and error
 */
export function useGeneratePolicyXml() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generate = async (templateId: string, values: Record<string, unknown>): Promise<string | null> => {
        setLoading(true);
        setError(null);

        try {
            const response = await generatePolicyXml(templateId, values);
            if (response.data.success) {
                return response.data.xml;
            }
            return null;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate XML';
            setError(errorMessage);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { generate, loading, error };
}
