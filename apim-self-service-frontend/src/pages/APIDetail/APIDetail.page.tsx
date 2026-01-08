import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { SecurityTab, ApiIdentityHeader, OperationCatalog } from '../../features/inventory';
import { CredentialsTab, useConsumerStore } from '../../features/consumer';

/**
 * APIDetailPage: Provides a localized view of a specific API Resource.
 * 
 * DESIGN:
 * - Data Isolation: Pulls product and API info from the centralized store.
 * - UX: High-density endpoint list with clear method indicators.
 * - Architecture: Strict separation between product-level and API-level metadata.
 */

import { useAuth } from '../../features/auth';
import { useProductQuery, useOperationsQuery } from '../../features/inventory/api/inventoryQueries';

export const APIDetailPage = () => {
    const { productId, apiId } = useParams<{ productId: string; apiId: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'credentials'>('overview');

    // --- Data Fetching ---
    const { data: product } = useProductQuery(productId || '');
    const { data: operations } = useOperationsQuery(productId || '', apiId || '');

    // --- Store Integration ---
    const { user } = useAuth();
    // Replaced useInventoryStore with TanStack Query
    const { subscriptions, fetchSubscriptions } = useConsumerStore();

    // --- Data Selectors ---

    // Derive API and attach operations if loaded
    const api = useMemo(() => {
        const foundApi = product?.apis.find(a => a.id === apiId);
        if (!foundApi) return null;
        if (operations) return { ...foundApi, operations };
        return foundApi;
    }, [product, apiId, operations]);

    // Filtered Subscriptions for this product
    const productSubscriptions = useMemo(() =>
        subscriptions.filter((s: any) => s.productId === productId),
        [subscriptions, productId]);

    // --- Permission Logic ---
    const canEditPolicies = useMemo(() => {
        if (!user || !product || !api) return false;
        if (user.role === 'admin') return true;

        const isApiOwner = api.originTeamId && user.teams?.includes(api.originTeamId);
        const isProductOwner = user.teams?.includes(product.ownerTeamId);

        // Critical GRP Check: GRP Members are Product Owners but CANNOT edit API Policies unless they own the API
        if (product.type === 'grp') {
            return !!isApiOwner;
        }

        // Standard Product: Product Owner OR API Owner can edit
        return !!(isProductOwner || isApiOwner);
    }, [user, product, api]);

    // --- Effects ---
    // Operations are now fetched automatically via useOperationsQuery hook.

    // Fetch subscriptions if missing
    useEffect(() => {
        if (subscriptions.length === 0) {
            fetchSubscriptions();
        }
    }, [subscriptions.length, fetchSubscriptions]);

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

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📋' },
        { id: 'security', label: 'Security', icon: '🛡️' },
        { id: 'credentials', label: 'Credentials', icon: '🔑' },
    ] as const;

    return (
        <MainLayout>
            <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                <ApiIdentityHeader product={product} api={api} canEditPolicies={canEditPolicies} />

                {/* Tab Navigation */}
                <div className="max-w-7xl mx-auto px-6 mt-4">
                    <div className="flex space-x-8">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    pb-4 text-[10px] uppercase tracking-widest font-black transition-all border-b-2
                                    ${activeTab === tab.id
                                        ? 'text-blue-600 border-blue-600'
                                        : 'text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-slate-300'}
                                `}
                            >
                                <span className="mr-2">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'overview' && (
                    <OperationCatalog productId={productId!} api={api} />
                )}
                {activeTab === 'security' && (
                    <SecurityTab api={api} />
                )}
                {activeTab === 'credentials' && (
                    <CredentialsTab subscriptions={productSubscriptions} />
                )}
            </div>
        </MainLayout>
    );
};
