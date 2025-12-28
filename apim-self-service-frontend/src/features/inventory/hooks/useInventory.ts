/**
 * Inventory Feature - Custom Hooks
 * 
 * React hooks for inventory data fetching using MFE pattern.
 * All data fetching goes through these hooks which use the API client.
 * 
 * @module features/inventory/hooks
 */

import { useState, useEffect } from 'react';
import {
    getProducts,
    getAdminProducts,
    getOrphanedResources,
    getAdGroups,
    getPermissionMatrix
} from '../api/inventoryClient';
import type { Product } from '../../../types/entities';

/**
 * Orphaned resource type (simplified for now)
 */
export interface OrphanedResource {
    id: string;
    name: string;
    type: 'Product' | 'API' | 'Subscription';
    environment: string;
    details: any;
    isOrphaned: boolean;
}

/**
 * AD Group type
 */
export interface AdGroup {
    id: string;
    name: string;
    description: string;
}

/**
 * Hook to fetch products
 */
export function useProducts(environment?: string) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        getProducts(environment)
            .then((response) => {
                if (mounted) {
                    setProducts(response.data);
                }
            })
            .catch((err: Error) => {
                if (mounted) {
                    setError(err.message || 'Failed to load products');
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, [environment]);

    return { products, loading, error };
}

/**
 * Hook to fetch admin products
 */
export function useAdminProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        // TODO: Replace with actual API call when backend ready
        // getAdminProducts()
        Promise.resolve({ data: [] as Product[] })
            .then((response) => {
                if (mounted) {
                    setProducts(response.data);
                }
            })
            .catch((err: Error) => {
                if (mounted) {
                    setError(err.message || 'Failed to load admin products');
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    return { products, loading, error };
}

/**
 * Hook to fetch orphaned resources
 */
export function useOrphanedResources() {
    const [orphans, setOrphans] = useState<OrphanedResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        // TODO: Replace with actual API call when backend ready
        // getOrphanedResources()
        Promise.resolve({ data: [] as OrphanedResource[] })
            .then((response) => {
                if (mounted) {
                    setOrphans(response.data);
                }
            })
            .catch((err: Error) => {
                if (mounted) {
                    setError(err.message || 'Failed to load orphaned resources');
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    return { orphans, loading, error };
}

/**
 * Hook to fetch AD groups
 */
export function useAdGroups() {
    const [groups, setGroups] = useState<AdGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        // TODO: Replace with actual API call when backend ready
        // getAdGroups()
        Promise.resolve({ data: [] as AdGroup[] })
            .then((response) => {
                if (mounted) {
                    setGroups(response.data);
                }
            })
            .catch((err: Error) => {
                if (mounted) {
                    setError(err.message || 'Failed to load AD groups');
                }
            })
            .finally(() => {
                if (mounted) {
                    setLoading(false);
                }
            });

        return () => {
            mounted = false;
        };
    }, []);

    return { groups, loading, error };
}
