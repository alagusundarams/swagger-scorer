/**
 * @fileoverview Validation Hook
 * 
 * Custom hook for real-time field validation with debouncing
 * NO GOD OBJECTS - focused on validation only
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { validateApiPath, validateProductName } from '../api/validationClient';

/**
 * Debounce delay for validation (ms)
 */
const VALIDATION_DEBOUNCE_MS = 300;

/**
 * Hook for validating product names in real-time
 */
export function useProductNameValidation(environment: string = 'DEV') {
    const { setValidationError, setValidating, clearValidation } = useStore();
    const timeoutRef = useRef<NodeJS.Timeout>();

    const validate = useCallback(
        async (name: string) => {
            // Clear previous timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Don't validate empty fields
            if (!name || name.trim() === '') {
                clearValidation('productName');
                return;
            }

            // Debounce validation
            timeoutRef.current = setTimeout(async () => {
                setValidating('productName', true);

                try {
                    const result = await validateProductName(name, environment);

                    if (result.isDuplicate) {
                        setValidationError('productName', {
                            field: 'productName',
                            message: result.message,
                            conflicts: result.conflicts
                        });
                    } else {
                        clearValidation('productName');
                    }
                } catch (error) {
                    console.error('Validation error:', error);
                    // Don't block user on validation errors
                    clearValidation('productName');
                } finally {
                    setValidating('productName', false);
                }
            }, VALIDATION_DEBOUNCE_MS);
        },
        [environment, setValidationError, setValidating, clearValidation]
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return validate;
}

/**
 * Hook for validating API paths in real-time
 */
export function useApiPathValidation(environment: string = 'DEV') {
    const { setValidationError, setValidating, clearValidation } = useStore();
    const timeoutRef = useRef<NodeJS.Timeout>();

    const validate = useCallback(
        async (path: string) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            if (!path || path.trim() === '') {
                clearValidation('apiPath');
                return;
            }

            timeoutRef.current = setTimeout(async () => {
                setValidating('apiPath', true);

                try {
                    const result = await validateApiPath(path, environment);

                    if (result.isDuplicate) {
                        setValidationError('apiPath', {
                            field: 'apiPath',
                            message: result.message,
                            conflicts: result.conflicts
                        });
                    } else {
                        clearValidation('apiPath');
                    }
                } catch (error) {
                    console.error('Validation error:', error);
                    clearValidation('apiPath');
                } finally {
                    setValidating('apiPath', false);
                }
            }, VALIDATION_DEBOUNCE_MS);
        },
        [environment, setValidationError, setValidating, clearValidation]
    );

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return validate;
}

/**
 * Hook to get validation state for a field
 */
export function useValidationState(field: string) {
    const { validationErrors, validatingFields } = useStore();

    return {
        error: validationErrors[field] || null,
        isValidating: validatingFields.has(field),
        isValid: !validationErrors[field] && !validatingFields.has(field)
    };
}
