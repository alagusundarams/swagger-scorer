/**
 * @fileoverview Validation Slice
 * 
 * Manages validation state for forms (duplicate detection, etc.)
 * Follows the slice pattern - NO GOD OBJECTS
 */

import { type StateCreator } from 'zustand';

export interface ValidationError {
    field: string;
    message: string;
    conflicts?: Array<{
        id: string;
        name: string;
        [key: string]: any;
    }>;
}

export interface ValidationSlice {
    // State
    validationErrors: Record<string, ValidationError | null>;
    validatingFields: Set<string>;

    // Actions
    setValidationError: (field: string, error: ValidationError | null) => void;
    setValidating: (field: string, isValidating: boolean) => void;
    clearValidation: (field: string) => void;
    clearAllValidation: () => void;
}

export const createValidationSlice: StateCreator<ValidationSlice, [], [], ValidationSlice> = (set) => ({
    // Initial state
    validationErrors: {},
    validatingFields: new Set(),

    // Actions
    setValidationError: (field, error) =>
        set((state) => ({
            validationErrors: {
                ...state.validationErrors,
                [field]: error
            }
        })),

    setValidating: (field, isValidating) =>
        set((state) => {
            const newSet = new Set(state.validatingFields);
            if (isValidating) {
                newSet.add(field);
            } else {
                newSet.delete(field);
            }
            return { validatingFields: newSet };
        }),

    clearValidation: (field) =>
        set((state) => {
            const { [field]: _, ...rest } = state.validationErrors;
            const newSet = new Set(state.validatingFields);
            newSet.delete(field);
            return {
                validationErrors: rest,
                validatingFields: newSet
            };
        }),

    clearAllValidation: () =>
        set({
            validationErrors: {},
            validatingFields: new Set()
        })
});
