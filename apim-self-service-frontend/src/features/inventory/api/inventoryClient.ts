/**
 * ------------------------------------------------------------------
 * 📍 API Client: Inventory & Promotion
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Domain gateway for Products, APIs, and Environment Promotions.
 * - Handles the "Source of Truth" for Git-synced contracts and policies.
 * - Triggers the cross-environment promotion workflow (Creation of PRs).
 * ------------------------------------------------------------------
 */
import { api as baseClient } from '../../../api/baseClient';
import type { Product, API } from '../../../shared/types/domain';

/**
 * Inventory API Client - CORE ONLY
 * 
 * Manages only Product and API resources.
 * Teams, Subscriptions, and Governance logic has been decentralized.
 */

export interface PaginatedResponse<T> {
    products: T[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

/**
 * Get products with optional pagination
 * @param page - Page number (1-indexed), omit for all products
 * @param limit - Items per page, omit for all products
 */
export async function getProducts(): Promise<Product[]>;
export async function getProducts(page: number, limit: number, search?: string): Promise<PaginatedResponse<Product>>;
export async function getProducts(page?: number, limit?: number, search?: string): Promise<Product[] | PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', String(page));
    if (limit !== undefined) params.append('limit', String(limit));
    if (search !== undefined && search.trim() !== '') params.append('search', search);

    const url = `/products${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await baseClient.get(url);

    // If pagination params were provided, return paginated response
    if (page !== undefined && limit !== undefined) {
        return res.data as PaginatedResponse<Product>;
    }

    // Otherwise return just the products array (backward compatible)
    return Array.isArray(res.data) ? res.data : res.data.products;
};

export const getProduct = async (id: string, environment?: string): Promise<Product> => {
    const res = await baseClient.get(`/products/${id}${environment ? `?environment=${environment}` : ''}`);
    return res.data;
};

export const getApis = async (): Promise<API[]> => {
    const res = await baseClient.get('/apis');
    return res.data;
};

export const createProduct = async (data: Partial<Product>): Promise<Product> => {
    const res = await baseClient.post('/products', data);
    return res.data;
};

export const updateProduct = async (productId: string, data: Partial<Product>): Promise<Product> => {
    const res = await baseClient.put(`/products/${productId}`, data);
    return res.data;
};

export const getPermissionMatrix = async (productId: string, environment?: string): Promise<unknown> => {
    const res = await baseClient.get(`/admin/permissions/${productId}${environment ? `?env=${environment}` : ''}`);
    return res.data;
};

export const updatePermissionMatrix = async (id: string, data: unknown, environment?: string): Promise<unknown> => {
    const res = await baseClient.put(`/admin/permissions/${id}${environment ? `?env=${environment}` : ''}`, data);
    return res.data;
};

export const addApi = async (productId: string, data: Partial<API>): Promise<API> => {
    const res = await baseClient.post(`/products/${productId}/apis`, data);
    return res.data;
};

export const removeApi = async (productId: string, apiId: string): Promise<boolean> => {
    const res = await baseClient.delete(`/products/${productId}/apis/${apiId}`);
    return res.data.success;
};

export const requestPromotion = async (productId: string, targetEnv: string, policyXml?: string, variables?: { name: string; value: string }[]): Promise<unknown> => {
    const res = await baseClient.post(`/products/${productId}/promote`, {
        targetEnv,
        policyXml,
        variables
    });
    return res.data;
};

/**
 * Consolidated API object (Core only)
 */
export const inventoryApi = {
    getProducts,
    getProduct,
    getApis,
    createProduct,
    updateProduct,
    addApi,
    removeApi,
    getPermissionMatrix,
    updatePermissionMatrix,
    requestPromotion,
    getManifest: (productId: string, format: 'json' | 'tfvars') => baseClient.get<{ content: string }>(`/products/${productId}/manifest?format=${format}`),

    // Named Values
    getNamedValues: async (productId: string) => {
        const res = await baseClient.get(`/products/${encodeURIComponent(productId)}/named-values`);
        return res.data;
    },
    addNamedValue: async (productId: string, data: unknown) => {
        const res = await baseClient.post(`/products/${encodeURIComponent(productId)}/named-values`, data);
        return res.data;
    },
    deleteNamedValue: async (productId: string, valueId: string) => {
        const res = await baseClient.delete(`/products/${encodeURIComponent(productId)}/named-values/${valueId}`);
        return res.data;
    },
    getProductSpec: async (productId: string): Promise<{ spec: string }> => {
        const res = await baseClient.get(`/products/${encodeURIComponent(productId)}/spec`);
        return res.data;
    },
    // Product Policy
    getProductPolicy: async (productId: string): Promise<{ policyXml: string }> => {
        const res = await baseClient.get(`/products/${encodeURIComponent(productId)}/policy`);
        return res.data;
    },
    updateProductPolicy: async (productId: string, xml: string): Promise<any> => {
        const res = await baseClient.put(`/products/${encodeURIComponent(productId)}/policy`, { xml });
        return res.data;
    },
    // Product Subscriptions
    getProductSubscriptions: async (productId: string): Promise<any[]> => {
        const res = await baseClient.get(`/products/${encodeURIComponent(productId)}/subscriptions`);
        return res.data;
    },
    // Missing Operations Fetcher
    getOperations: async (productId: string, apiId: string): Promise<any[]> => {
        const res = await baseClient.get(`/products/${encodeURIComponent(productId)}/apis/${encodeURIComponent(apiId)}/operations`);
        return res.data;
    },
    // Eject to Self-Service
    ejectProduct: async (productId: string): Promise<Product> => {
        const res = await baseClient.post(`/products/${encodeURIComponent(productId)}/eject`);
        return res.data;
    },
    // Request Access (Subscription)
    requestAccess: async (productId: string, teamId: string, justification: string): Promise<any> => {
        const res = await baseClient.post(`/products/${encodeURIComponent(productId)}/subscriptions`, {
            teamId,
            justification
        });
        return res.data;
    },
    // App Registration Search
    // Identity Management
    searchAppRegistrations: async (q: string) => {
        const res = await baseClient.get(`/identity/azure-search?q=${encodeURIComponent(q)}`);
        return res.data; // Returns { clientId, displayName, appIdUri }[]
    },
    linkIdentity: async (payload: { productId: string, environment: string, clientId: string, displayName: string }) => {
        const res = await baseClient.post('/identity/link', payload);
        return res.data;
    }
};
