import { api as baseClient } from '../../../api/baseClient';
import type { Product, API } from '../types/inventoryTypes';

/**
 * Inventory API Client - CORE ONLY
 * 
 * Manages only Product and API resources.
 * Teams, Subscriptions, and Governance logic has been decentralized.
 */
export const getProducts = async (): Promise<Product[]> => {
    const res = await baseClient.get('/products');
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

export const requestPromotion = async (productId: string, targetEnv: string): Promise<unknown> => {
    const res = await baseClient.post(`/products/${productId}/promote`, { targetEnv });
    return res.data;
};

/**
 * Consolidated API object (Core only)
 */
export const inventoryApi = {
    getProducts,
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
        const res = await baseClient.get(`/products/${productId}/named-values`);
        return res.data;
    },
    addNamedValue: async (productId: string, data: unknown) => {
        const res = await baseClient.post(`/products/${productId}/named-values`, data);
        return res.data;
    },
    deleteNamedValue: async (productId: string, valueId: string) => {
        const res = await baseClient.delete(`/products/${productId}/named-values/${valueId}`);
        return res.data;
    }
};
