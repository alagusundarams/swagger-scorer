import { type StateCreator } from 'zustand';
import { inventoryApi } from '../api/inventoryClient';
import type { Product, API } from '../types/inventoryTypes';

/**
 * Inventory feature state interface - CORE ONLY
 */
export interface InventorySlice {
    products: Product[];
    currentProduct: Product | null;
    apis: API[];
    error: string | null;
    isLoading: boolean;

    // Actions
    fetchInventory: () => Promise<void>;
    fetchProduct: (id: string, environment?: string) => Promise<void>;
    loadProducts: () => Promise<void>;
    updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
    updateAPI: (id: string, updates: Partial<API>) => Promise<void>;
    addApiToProduct: (productId: string, apiData: Partial<API>) => Promise<void>;
    removeApiFromProduct: (productId: string, apiId: string) => Promise<void>;
    fetchOperations: (productId: string, apiId: string) => Promise<void>;

    // Named Values
    fetchConfiguration: (productId: string) => Promise<void>;
    addNamedValue: (productId: string, data: any) => Promise<void>;
    deleteNamedValue: (productId: string, valueId: string) => Promise<void>;

    setError: (error: string | null) => void;
}

/**
 * Inventory Slice - Feature Domain
 * 
 * Manages only Product and API inventory.
 * Teams, Subscriptions, and Governance state relocated to their respective domains.
 */
export const createInventorySlice: StateCreator<InventorySlice> = (set, get) => ({
    products: [],
    currentProduct: null,
    apis: [],
    error: null,
    isLoading: false,

    setError: (error) => set({ error }),

    fetchInventory: async () => {
        set({ error: null, isLoading: true });
        try {
            const [productsRes, apisRes] = await Promise.all([
                inventoryApi.getProducts(),
                inventoryApi.getApis()
            ]);

            set({
                products: productsRes,
                apis: apisRes,
                isLoading: false
            });
        } catch (error: any) {
            set({ error: error.message || "Failed to load inventory data.", isLoading: false });
        }
    },

    fetchProduct: async (id: string, environment?: string) => {
        set({ error: null, isLoading: true });
        try {
            const product = await inventoryApi.getProduct(id, environment);
            const { products } = get();

            // Update current product AND update it in the list if it exists
            set({
                currentProduct: product,
                products: products.some(p => p.id === id)
                    ? products.map(p => p.id === id ? product : p)
                    : [...products, product],
                isLoading: false
            });
        } catch (error: any) {
            set({ error: error.message || "Failed to load product.", isLoading: false });
        }
    },

    loadProducts: async () => {
        const { fetchInventory } = get();
        await fetchInventory();
    },



    updateProduct: async (id, updates) => {
        set((state) => ({
            products: state.products.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
        await inventoryApi.updateProduct(id, updates);
    },

    updateAPI: async (id, updates) => {
        console.log(`[InventorySlice] updateAPI called for ${id}`, updates);
    },

    addApiToProduct: async (productId, apiData) => {
        try {
            const newApi = await inventoryApi.addApi(productId, apiData);
            set((state) => ({
                apis: [...state.apis, newApi],
                products: state.products.map(p =>
                    p.id === productId
                        ? { ...p, apis: [...(p.apis || []), newApi] }
                        : p
                )
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to add API' });
            throw error;
        }
    },

    removeApiFromProduct: async (productId, apiId) => {
        try {
            await inventoryApi.removeApi(productId, apiId);
            set((state) => ({
                apis: state.apis.filter(a => a.id !== apiId),
                products: state.products.map(p =>
                    p.id === productId
                        ? { ...p, apis: (p.apis || []).filter(a => a.id !== apiId) }
                        : p
                )
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to remove API' });
            throw error;
        }
    },

    fetchConfiguration: async (productId) => {
        try {
            const values = await inventoryApi.getNamedValues(productId);
            set((state) => ({
                products: state.products.map(p =>
                    p.id === productId ? { ...p, namedValues: values } : p
                )
            }));
        } catch (error: any) {
            console.error("Failed to fetch configuration", error);
            // Don't block UI, just log
        }
    },

    addNamedValue: async (productId, data) => {
        try {
            const newValue = await inventoryApi.addNamedValue(productId, data);
            set((state) => ({
                products: state.products.map(p =>
                    p.id === productId
                        ? { ...p, namedValues: [...(p.namedValues || []), newValue] }
                        : p
                )
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to add configuration value' });
            throw error;
        }
    },

    deleteNamedValue: async (productId, valueId) => {
        try {
            await inventoryApi.deleteNamedValue(productId, valueId);
            set((state) => ({
                products: state.products.map(p =>
                    p.id === productId
                        ? { ...p, namedValues: (p.namedValues || []).filter(v => v.id !== valueId) }
                        : p
                )
            }));
        } catch (error: any) {
            set({ error: error.message || 'Failed to delete configuration value' });
            throw error;
        }
    },

    fetchOperations: async (productId: string, apiId: string) => {
        try {
            const operations = await inventoryApi.getOperations(productId, apiId);
            set((state) => ({
                products: state.products.map(p => {
                    if (p.id !== productId) return p;
                    return {
                        ...p,
                        apis: p.apis.map(a => {
                            if (a.id !== apiId) return a;
                            return { ...a, operations };
                        })
                    };
                })
            }));
        } catch (error: any) {
            console.error("Failed to fetch operations", error);
        }
    }
});
