import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, API } from '../types/inventoryTypes';
import { inventoryApi } from '../api/inventoryClient';

export interface InventoryState {
    products: Product[];
    apis: API[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchInventory: () => Promise<void>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    addApiToProduct: (productId: string, apiData: Partial<API>) => Promise<void>;
    removeApiFromProduct: (productId: string, apiId: string) => Promise<void>;
}

/**
 * Inventory Store - FEATURE DOMAIN
 */
export const useInventoryStore = create<InventoryState>()(
    persist(
        (set) => ({
            products: [],
            apis: [],
            isLoading: false,
            error: null,

            fetchInventory: async () => {
                set({ isLoading: true, error: null });
                try {
                    const [products, apis] = await Promise.all([
                        inventoryApi.getProducts(),
                        inventoryApi.getApis()
                    ]);
                    set({
                        products,
                        apis,
                        isLoading: false
                    });
                } catch (error: any) {
                    set({ error: error.message, isLoading: false });
                }
            },

            updateProduct: async (id, updates) => {
                try {
                    await inventoryApi.updateProduct(id, updates);
                    set((state) => ({
                        products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
                    }));
                } catch (error: any) {
                    set({ error: error.message });
                }
            },

            addApiToProduct: async (productId, apiData) => {
                try {
                    const newApi = await inventoryApi.addApi(productId, apiData);
                    set((state) => ({
                        // Update APIs list
                        apis: [...state.apis, newApi],
                        // Update Product's API count in the products list for UI consistency
                        products: state.products.map(p =>
                            p.id === productId
                                ? { ...p, apis: [...(p.apis || []), newApi] }
                                : p
                        )
                    }));
                } catch (error: any) {
                    set({ error: error.message });
                    throw error; // Re-throw to let UI handle success/closure
                }
            },

            removeApiFromProduct: async (productId, apiId) => {
                try {
                    await inventoryApi.removeApi(productId, apiId);
                    set((state) => ({
                        // Remove from APIs list
                        apis: state.apis.filter(a => a.id !== apiId),
                        // Update products list
                        products: state.products.map(p =>
                            p.id === productId
                                ? { ...p, apis: (p.apis || []).filter(a => a.id !== apiId) }
                                : p
                        )
                    }));
                } catch (error: any) {
                    set({ error: error.message });
                    throw error;
                }
            }
        }),
        { name: 'inventory-storage' }
    )
);
