import { useInventoryStore } from '../store/inventoryStore';
import type { Product, API } from '../types/inventoryTypes';

/**
 * Inventory Hook - Feature Accessor
 * 
 * Consumes the feature-local inventory store.
 */
export const useInventory = () => {
    const {
        products,
        apis,
        isLoading,
        error
    } = useInventoryStore(state => state);

    const getProductById = (id: string): Product | undefined => {
        return products.find((p: any) => p.id === id);
    };

    const getApiById = (id: string): API | undefined => {
        return apis.find((a: any) => a.id === id);
    };

    return {
        products,
        apis,
        isLoading,
        error,
        getProductById,
        getApiById
    };
};
