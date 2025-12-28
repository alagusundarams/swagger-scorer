import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createDataSlice, DataSlice } from './slices/dataSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createValidationSlice, ValidationSlice } from './slices/validationSlice';

/**
 * Root Store Type
 * Combines all modular slices into a single state object.
 */
export type AppState = AuthSlice & DataSlice & UISlice & ValidationSlice;

/**
 * Global application store.
 * 
 * Uses the slice pattern to maintain scalability and organization.
 * Each slice manages a specific domain of the application state.
 * 
 * @see src/store/slices/ for individual implementations.
 */
export const useStore = create<AppState>()((...a) => ({
    ...createAuthSlice(...a),
    ...createDataSlice(...a),
    ...createUISlice(...a),
    ...createValidationSlice(...a),
}));
