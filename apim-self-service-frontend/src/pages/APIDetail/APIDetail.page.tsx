import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useInventoryStore } from '../../features/inventory/hooks/useInventoryStore';
import { ApiIdentityHeader } from '../../features/inventory/components/api-details/ApiIdentityHeader';
import { OperationCatalog } from '../../features/inventory/components/api-details/OperationCatalog';

/**
 * APIDetailPage: Provides a localized view of a specific API Resource.
 * 
 * DESIGN:
 * - Data Isolation: Pulls product and API info from the centralized store.
 * - UX: High-density endpoint list with clear method indicators.
 * - Architecture: Strict separation between product-level and API-level metadata.
 */

export const APIDetailPage = () => {
    const { productId, apiId } = useParams<{ productId: string; apiId: string }>();
    const navigate = useNavigate();

    // --- Store Integration ---
    const { products } = useInventoryStore();

    // --- Data Selectors ---
    const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);
    const api = useMemo(() => product?.apis.find(a => a.id === apiId), [product, apiId]);

    // Handle missing data gracefully
    if (!product || !api) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">🔍</div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter">Interface Not Located</h1>
                    <p className="text-gray-500 dark:text-slate-400 mb-8 font-medium">The specific API resource could not be found in the current landscape.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                    >
                        Return to Control Center
                    </button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <ApiIdentityHeader product={product} api={api} />
            <OperationCatalog productId={productId!} api={api} />
        </MainLayout>
    );
};
