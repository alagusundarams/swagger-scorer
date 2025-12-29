/**
 * Contract Editor - Custom Hooks
 */
import { useEffect } from 'react';
import { useContractStore } from '../store/contractStore';

/**
 * Hook for managing a specific contract's editing session.
 * Syncs with the feature-local useContractStore.
 */
export function useContract(productId: string, filename: string, defaultContent: string) {
    const store = useContractStore();

    useEffect(() => {
        store.loadDraft(productId, filename, defaultContent);
    }, [productId, filename, defaultContent]);

    return {
        contract: store.content,
        loading: store.isLoading,
        error: store.error,
        setContract: store.updateContent,
        isModified: store.isModified,
        storageUsage: store.storageUsage,
        save: (language: 'yaml' | 'json' | 'xml') => store.saveChanges(productId, filename, language)
    };
}

export function useContractValidation() {
    // Keep internal for now as it doesn't need persistence
    return {
        validate: async (_content: string) => {
            // TODO: Implement validation via analyzer feature
        },
        validating: false,
        errors: []
    };
}
