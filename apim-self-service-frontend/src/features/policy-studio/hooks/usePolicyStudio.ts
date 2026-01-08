/**
 * Policy Studio Custom Hooks
 * 
 * React hooks for policy-related data fetching and state management.
 * Follows MFE (Micro Frontend) architecture principles.
 * 
 * @module features/policy-studio/hooks
 */

/**
 * ------------------------------------------------------------------
 * 📍 Custom Hook: usePolicyStudio (Functional Logic)
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Managed state for the Visual Policy Builder DAG.
 * - Handles the "Drag and Drop" logic and swimlane sorting.
 * - Bridges the Visual DAG to the XML Generator/Parser utilities.
 * - Controls the "Section-Specific" (Inbound/Outbound) editing context.
 * ------------------------------------------------------------------
 */
import {
    usePolicyDisplayQuery,
    usePolicyTemplatesQuery,
    useGeneratePolicyMutation
} from '../api/policyQueries';

/**
 * Hook to fetch and manage policy display structure
 * 
 * @param productId - Product ID to fetch policy for
 * @returns Display structure, loading state, and error
 */
export function usePolicyDisplay(productId: string) {
    const { data, isLoading, error } = usePolicyDisplayQuery(productId);

    return {
        displayStructure: data || null,
        loading: isLoading,
        error: error ? (error as Error).message : null
    };
}

/**
 * Hook to fetch policy templates for a specific section
 * 
 * @param section - Policy section (inbound, backend, outbound, on-error)
 * @returns Templates array, loading state, and error
 */
export function usePolicyTemplates(section: string) {
    const { data, isLoading, error } = usePolicyTemplatesQuery(section);

    return {
        templates: data || [],
        loading: isLoading,
        error: error ? (error as Error).message : null
    };
}

/**
 * Hook to generate policy XML from template
 * 
 * @returns Generate function, loading state, and error
 */
export function useGeneratePolicyXml() {
    const mutation = useGeneratePolicyMutation();

    const generate = async (templateId: string, values: Record<string, unknown>): Promise<string | null> => {
        try {
            const result = await mutation.mutateAsync({ templateId, values });
            return result;
        } catch (e) {
            return null;
        }
    };

    return {
        generate,
        loading: mutation.isPending,
        error: mutation.error ? (mutation.error as Error).message : null
    };
}
