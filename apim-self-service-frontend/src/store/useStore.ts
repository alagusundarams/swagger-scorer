import { create } from 'zustand';
import { createAuthSlice } from '../features/auth/store/authSlice';
import type { AuthSlice } from '../features/auth/store/authSlice';
import { createUISlice } from './slices/uiSlice';
import type { UISlice } from './slices/uiSlice';
import { createPolicySlice, PolicySlice } from '../features/provisioning/store/policySlice';

/**
 * Root Store Type - PURE GLOBAL STATE
 * 
 * Global store now contains ONLY truly cross-cutting concerns:
 * - Auth: User authentication state (used by all layouts and features)
 * - UI: Theme, navigation, and cross-feature notifications
 * - Policy: Policy Templates (used across Policy Studio features)
 * 
 * Feature-specific concerns moved to their respective modules:
 * - Inventory & Products -> features/inventory/store/
 * - Provisioning Validation -> features/provisioning/store/
 * - Contract Editor -> features/contract-editor/store/
 */
export type AppState = AuthSlice & UISlice & PolicySlice;

/**
 * Global application store.
 * 
 * Uses the slice pattern for cross-cutting themes ONLY.
 * Feature-specific logic is isolated to maintain MFE architecture.
 */
export const useStore = create<AppState>()((...a) => ({
    ...createAuthSlice(...a),
    ...createUISlice(...a),
    ...createPolicySlice(...a),
}));
