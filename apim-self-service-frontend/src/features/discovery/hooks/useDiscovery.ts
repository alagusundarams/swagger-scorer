import { useState, useCallback } from 'react';

export const useDiscovery = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchProducts = useCallback(async (_query: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // Placeholder for discovery search logic
            // Will integrate with inventoryClient when ready
            return [];
        } catch (err: any) {
            setError(err.message || 'Failed to search products');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        isLoading,
        error,
        searchProducts
    };
};
