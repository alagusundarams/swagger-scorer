import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
// REMOVED: createDataSlice - moved to features/inventory/store/inventorySlice.ts for proper MFE
import { createUISlice, UISlice } from './slices/uiSlice';
import { createValidationSlice, ValidationSlice } from './slices/validationSlice';

/**
 * Root Store Type - PROPER MFE ARCHITECTURE
 * 
 * Global store now contains ONLY truly global state:
 * - Auth: User authentication state
 * - UI: Theme, sidebar, notifications
 * - Validation: Form validation state
 * 
 * Feature-specific state (products, subscriptions, teams) moved to:
 * - features/inventory/store/inventorySlice.ts
 * 
 * This achieves proper MFE architecture with feature autonomy.
 */
export type AppState = AuthSlice & UISlice & ValidationSlice;

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
    // REMOVED: ...createDataSlice(...a) - moved to inventory feature
    ...createUISlice(...a),
    ...createValidationSlice(...a),
}));
