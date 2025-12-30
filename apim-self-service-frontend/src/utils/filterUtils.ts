import { type Product } from '../features/inventory/types/inventoryTypes';
import { type Environment } from '../types/commonTypes';
import { type GlobalProduct, type GlobalAPI } from '../features/admin/types/adminTypes';

/**
 * Standardized search logic for products and APIs.
 * Searches across name, displayName, and description.
 */
export const matchesSearchQuery = (
    item: { name?: string; displayName?: string; description?: string; path?: string },
    query: string
): boolean => {
    const lowQuery = query.toLowerCase().trim();
    if (!lowQuery) return true;

    return (
        (item.name || '').toLowerCase().includes(lowQuery) ||
        (item.displayName || '').toLowerCase().includes(lowQuery) ||
        (item.description || '').toLowerCase().includes(lowQuery) ||
        (item.path || '').toLowerCase().includes(lowQuery)
    );
};

/**
 * Filter options for standard Product entities
 */
export interface ProductFilterOptions {
    searchQuery?: string;
    environment?: Environment;
    ownerTeamId?: string;
    region?: string;
}

/**
 * Centralized filtering for Products
 */
export const filterProducts = (products: Product[], options: ProductFilterOptions): Product[] => {
    const { searchQuery, environment, ownerTeamId, region } = options;

    return products.filter(p => {
        // 1. Team Filter
        if (ownerTeamId && ownerTeamId !== 'all' && p.ownerTeamId !== ownerTeamId) {
            return false;
        }

        // 2. Environment Filter
        if (environment && environment !== 'ALL' && p.environment !== environment) {
            return false;
        }

        // 3. Region Filter
        if (region && region !== 'ALL' && p.region !== region) {
            return false;
        }

        // 4. Search Filter
        if (searchQuery && !matchesSearchQuery(p, searchQuery)) {
            return false;
        }

        return true;
    });
};

/**
 * Centralized filtering for Global (Admin) Products
 */
export const filterGlobalProducts = (
    products: GlobalProduct[],
    searchQuery: string,
    environment: string
): GlobalProduct[] => {
    return products.filter(p => {
        const matchesSearch = matchesSearchQuery(p, searchQuery);
        const matchesEnv = environment === 'ALL' || p.deployments.some(d => d.environment === environment);
        return matchesSearch && matchesEnv;
    });
};

/**
 * Centralized filtering for Global (Admin) APIs
 */
export const filterGlobalApis = (
    apis: GlobalAPI[],
    searchQuery: string,
    environment: string
): GlobalAPI[] => {
    return apis.filter(a => {
        const matchesSearch = matchesSearchQuery(a, searchQuery);
        const matchesEnv = environment === 'ALL' || a.deployments.some(d => d.environment === environment);
        return matchesSearch && matchesEnv;
    });
};
