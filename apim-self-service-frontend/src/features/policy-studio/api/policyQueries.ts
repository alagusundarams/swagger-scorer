/**
 * Policy Studio Query Hooks
 * 
 * TanStack Query wrappers for policy-related API calls.
 * Replaces manual useEffect fetching in hooks/usePolicyStudio.ts.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    getPolicyDisplay,
    getPolicyTemplatesBySection,
    generatePolicyXml
} from './policyClient';

// Query Keys
export const policyKeys = {
    all: ['policy'] as const,
    display: (productId: string) => [...policyKeys.all, 'display', productId] as const,
    templates: (section: string) => [...policyKeys.all, 'templates', section] as const,
};

/**
 * Hook to fetch policy display structure
 */
export function usePolicyDisplayQuery(productId: string) {
    return useQuery({
        queryKey: policyKeys.display(productId),
        queryFn: async () => {
            const response = await getPolicyDisplay(productId);
            // Return just the data part we care about
            return response.data.displayStructure;
        },
        enabled: !!productId, // Only fetch if ID is present
    });
}

/**
 * Hook to fetch policy templates for a section
 */
export function usePolicyTemplatesQuery(section: string) {
    return useQuery({
        queryKey: policyKeys.templates(section),
        queryFn: async () => {
            const response = await getPolicyTemplatesBySection(section);
            return response.data.templates;
        },
        enabled: !!section,
    });
}

/**
 * Hook to generate XML from template
 */
export function useGeneratePolicyMutation() {
    return useMutation({
        mutationFn: async ({ templateId, values }: { templateId: string; values: Record<string, unknown> }) => {
            const response = await generatePolicyXml(templateId, values);
            if (!response.data.success) {
                throw new Error('Failed to generate XML');
            }
            return response.data.xml;
        }
    });
}
