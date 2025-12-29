import { create } from 'zustand';
import { createValidationSlice } from './validationSlice';
import type { ValidationSlice } from './validationSlice';

/**
 * Feature Store: Provisioning Validation
 * 
 * Decentralized from global store. Manages state for:
 * - Field-level validation errors
 * - In-progress validation status
 * 
 * @module features/provisioning/store
 */
export const useValidationStore = create<ValidationSlice>()((...a) => ({
    ...createValidationSlice(...a),
}));
