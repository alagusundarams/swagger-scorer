import { useMemo, useCallback } from 'react';
import { useValidationStore } from '../store/validationStore';
import { validateProductName } from '../api/validationClient';

/**
 * Hook for performing real-time product name validation.
 * Uses the feature-local useValidationStore.
 */
export function useProductNameValidation(environment: string) {
    const { setValidationError, setValidating } = useValidationStore();

    return useCallback(async (name: string) => {
        if (!name || name.length < 3) return;

        setValidating('productName', true);
        try {
            const response = await validateProductName(name, environment);
            setValidationError('productName', response.isValid ? null : {
                field: 'productName',
                message: response.message || 'Product name already exists in this environment',
                conflicts: response.conflicts
            });
        } catch (err) {
            console.error('Validation failed:', err);
        } finally {
            setValidating('productName', false);
        }
    }, [environment, setValidationError, setValidating]);
}

/**
 * Hook for accessing the entire validation state.
 */
export function useValidationState() {
    const { validationErrors, validatingFields, clearValidation, clearAllValidation } = useValidationStore();

    return {
        errors: validationErrors,
        isValidating: validatingFields,
        hasErrors: useMemo(() =>
            Object.values(validationErrors).some(e => e !== null),
            [validationErrors]
        ),
        clear: clearValidation,
        clearAll: clearAllValidation
    };
}
