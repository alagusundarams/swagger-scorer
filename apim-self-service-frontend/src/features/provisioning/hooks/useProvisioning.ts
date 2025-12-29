import { useCallback, useMemo } from 'react';

/**
 * Hook for managing the onboarding workflow state and validation.
 * Stubbed version to resolve build errors while maintaining the hook's existence.
 */
export function useProvisioning() {
    // Return empty/mocked state since this hook is currently unused 
    // and its store state was refactored/moved.
    const provisioning = {};
    const result = null;
    const isLoading = false;
    const error = null;

    const isSubmitting = useMemo(() => isLoading, [isLoading]);

    const submit = useCallback(async () => {
        console.log('[useProvisioning] submit called (stub)');
    }, []);

    return {
        provisioning,
        result,
        isLoading,
        isSubmitting,
        error,
        submit
    };
}
