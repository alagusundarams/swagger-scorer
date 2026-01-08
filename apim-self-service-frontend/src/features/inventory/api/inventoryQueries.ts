import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api as baseClient } from '../../../api/baseClient';
import { inventoryApi } from './inventoryClient';

// Query Keys
export const inventoryKeys = {
    all: ['inventory'] as const,
    global: ['inventory', 'global'] as const,
    products: ['inventory', 'products'] as const,
    product: (id: string, env?: string) => [...inventoryKeys.products, id, env] as const,
    apis: ['inventory', 'apis'] as const,
    api: (id: string) => [...inventoryKeys.apis, id] as const,
    namedValues: (id: string) => [...inventoryKeys.products, id, 'namedValues'] as const,
    operations: (id: string) => [...inventoryKeys.api(id), 'operations'] as const,
};

/**
 * Hook to fetch Global Inventory (Admin View)
 */
export function useGlobalInventoryQuery() {
    return useQuery({
        queryKey: inventoryKeys.global,
        queryFn: async () => {
            const res = await baseClient.get('/admin/global-inventory');
            return res.data as { products: any[], apis: any[] };
        },
        staleTime: 60 * 1000, // 1 minute
    });
}

/**
 * Hook to fetch all products
 */
/**
 * Hook to fetch ALL products (Simple Array)
 */
export function useProductsQuery() {
    return useQuery({
        queryKey: inventoryKeys.products,
        queryFn: async () => {
            const res = await inventoryApi.getProducts();
            return Array.isArray(res) ? res : res.products;
        }
    });
}

/**
 * Hook to fetch paginated products
 */
export function usePaginatedProductsQuery(page: number, limit: number) {
    return useQuery({
        queryKey: [...inventoryKeys.products, { page, limit }],
        queryFn: async () => {
            const res = await inventoryApi.getProducts(page, limit);
            // Ensure we return the PaginatedResponse structure logic
            // inventoryApi.getProducts guarantees PaginatedResponse if page/limit are passed
            return res as { products: any[], pagination: any };
        },
        placeholderData: keepPreviousData,
    });
}

/**
 * Hook to fetch single product
 */
export function useProductQuery(productId: string, environment?: string) {
    return useQuery({
        queryKey: inventoryKeys.product(productId, environment),
        queryFn: () => inventoryApi.getProduct(productId, environment),
        enabled: !!productId,
    });
}

/**
 * Hook to fetch APIs
 */
export function useApisQuery() {
    return useQuery({
        queryKey: inventoryKeys.apis,
        queryFn: () => inventoryApi.getApis(),
    });
}

/**
 * Hook to fetch Named Values
 */
export function useNamedValuesQuery(productId: string) {
    return useQuery({
        queryKey: inventoryKeys.namedValues(productId),
        queryFn: () => inventoryApi.getNamedValues(productId),
        enabled: !!productId,
    });
}

/**
 * Hook to fetch API Operations
 */
export function useOperationsQuery(productId: string, apiId: string) {
    return useQuery({
        queryKey: inventoryKeys.operations(apiId),
        queryFn: async () => {
            const ops = await inventoryApi.getOperations(productId, apiId);
            return ops || [];
        },
        enabled: !!(productId && apiId),
    });
}
