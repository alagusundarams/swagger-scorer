import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../features/auth';
import { usePaginatedProductsQuery } from '../../features/inventory/api/inventoryQueries';
import { useSubscriptionsQuery, useRequestAccessMutation } from '../../features/consumer';
import { useTeamsQuery } from '../../features/teams';
import { DiscoveryHero, DiscoveryProductCard, SubscriptionConfirmModal } from '../../features/discovery';

/**
 * BrowsePage Controller
 * 
 * ------------------------------------------------------------------
 * 📍 Purpose:
 * Route Entry Point for `/browse`.
 * Allows users to discover API Products they do NOT yet have access to.
 * 
 * 🔄 Data Flow:
 * 1. `useInventoryStore` -> Fetches ALL available products (cached).
 * 2. `useConsumerStore` -> Fetches current user's subscriptions.
 * 3. Logic -> Filters OUT products the user already "owns" (to show only new opportunities).
 * 4. `filterUtils` -> Applies Client-side search (Name, Description).
 * 5. Event -> On "Subscribe", opens `SubscriptionConfirmModal` (imported from Discovery Feature).
 * 
 * 🧩 MFE Boundaries:
 * - This Page orchestrates the "Discovery" and "Consumer" features.
 * - It uses `MainLayout` to provide the shell.
 * ------------------------------------------------------------------
 */
export const BrowsePage = () => {
    const navigate = useNavigate();
    const { setPageTitle } = useStore();
    const { user } = useAuth();

    useEffect(() => {
        setPageTitle('Browse APIs');
    }, [setPageTitle]);

    // --- Pagination & Search State ---
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Store Integration (TanStack Query) ---
    const { data: paginatedData, isLoading } = usePaginatedProductsQuery(page, limit, searchQuery);
    const { data: allSubscriptions = [] } = useSubscriptionsQuery();
    const { data: allTeams = [] } = useTeamsQuery();

    const allProducts = paginatedData?.products || [];
    const pagination = paginatedData?.pagination;

    // Mutations
    const requestAccessMutation = useRequestAccessMutation();

    // --- UI State ---
    const [selectedTeamId, setSelectedTeamId] = useState<string>(user?.teams[0] || '');
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    // --- Data Derivation ---
    const userTeams = useMemo(() => allTeams.filter(t => user?.teams.includes(t.id)), [allTeams, user]);

    // Identification of products user has already interacted with (subscribed or pending)
    const activeSubscriptionProductIds = useMemo(() =>
        allSubscriptions
            .filter(s => user?.teams.includes(s.subscriberTeamId) && (s.state === 'active' || s.state === 'pending'))
            .map(s => s.productId)
        , [allSubscriptions, user]);

    // View: Only show products that can be subscribed to
    // Note: With server-side pagination, "hiding" already subscribed products 
    // ideally should happen on the server to maintain correct page sizes.
    // For now, we filter client-side which might slightly reduce the visible count per page.
    const availableProducts = useMemo(() =>
        allProducts.filter(p => !activeSubscriptionProductIds.includes(p.id))
        , [allProducts, activeSubscriptionProductIds]);

    const handleSearchChange = (val: string) => {
        setSearchQuery(val);
        setPage(1); // Reset to first page on new search
    };

    // --- Handlers ---
    const handleSubscribeInitiate = (productId: string) => {
        setSelectedProductId(productId);
        setShowSubscribeModal(true);
    };

    const handleConfirmSubscription = () => {
        if (!selectedProductId || !selectedTeamId) return;

        requestAccessMutation.mutate({ productId: selectedProductId, teamId: selectedTeamId });
        setShowSubscribeModal(false);

        // Navigation gives feedback of progress
        navigate('/');
    };

    return (
        <MainLayout>
            <DiscoveryHero
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
            />

            {/* Catalog Grid */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {pagination?.total || availableProducts.length} Assets available for integration
                        </p>
                    </div>

                    {/* Simple Pagination Controls */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoading}
                                className="p-2 rounded-xl border border-gray-100 dark:border-slate-800 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                ← Prev
                            </button>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                Page {page} of {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => setPage((p: number) => Math.min(pagination.totalPages, p + 1))}
                                disabled={page === pagination.totalPages || isLoading}
                                className="p-2 rounded-xl border border-gray-100 dark:border-slate-800 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest"
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 opacity-50">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-80 bg-gray-50 dark:bg-slate-800/20 animate-pulse rounded-[3rem]"></div>
                        ))}
                    </div>
                ) : availableProducts.length === 0 ? (
                    <div className="bg-gray-50/50 dark:bg-slate-800/20 rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 transition-all">
                        <div className="text-7xl mb-6 opacity-40">🛸</div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter">Inventory Empty</h3>
                        <p className="text-gray-400 dark:text-slate-500 font-medium">No results match your current search parameters.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {availableProducts.map((product: any) => (
                                <DiscoveryProductCard
                                    key={product.id}
                                    product={product}
                                    ownerTeam={allTeams.find(t => t.id === product.ownerTeamId)}
                                    onSubscribe={handleSubscribeInitiate}
                                />
                            ))}
                        </div>

                        {/* Bottom Pagination */}
                        {pagination && pagination.totalPages > 1 && (
                            <div className="mt-12 flex justify-center items-center gap-6">
                                <button
                                    onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                                    disabled={page === 1 || isLoading}
                                    className="px-8 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm disabled:opacity-30 hover:scale-105 transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                    Previous Page
                                </button>
                                <button
                                    onClick={() => setPage((p: number) => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page === pagination.totalPages || isLoading}
                                    className="px-8 py-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-30 hover:scale-105 transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                    Next Page
                                </button>
                            </div>
                        )}
                    </>
                )}
            </main>

            <SubscriptionConfirmModal
                isOpen={showSubscribeModal}
                onClose={() => setShowSubscribeModal(false)}
                onConfirm={handleConfirmSubscription}
                selectedProduct={allProducts.find(p => p.id === selectedProductId)}
                selectedTeamId={selectedTeamId}
                onTeamChange={setSelectedTeamId}
                userTeams={userTeams}
            />
        </MainLayout>
    );
};
