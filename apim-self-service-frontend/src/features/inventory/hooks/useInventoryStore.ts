/**
 * Inventory Feature Store Hook
 * 
 * Provides access to inventory state and actions.
 * This is the ONLY way components should access inventory data.
 * 
 * Proper MFE: Feature manages own state, exposes via hook.
 */

import { create } from 'zustand';
import { createInventorySlice } from '../store/inventorySlice';
import type { InventorySlice } from '../store/inventorySlice';

/**
 * Inventory feature store
 * 
 * Usage:
 * ```tsx
 * const { products, teams, fetchInitialData } = useInventoryStore();
 * ```
 */
export const useInventoryStore = create<InventorySlice>()((...a) => ({
    ...createInventorySlice(...a),
}));
