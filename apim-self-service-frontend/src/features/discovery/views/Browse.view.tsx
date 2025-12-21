import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';

/**
 * BrowsePage: Discovery portal for API products.
 * 
 * FEATURES:
 * - Real-time filtering across the enterprise catalog.
 * - Integration with the centralized store for subscription state.
 * - Multi-team subscription support.
 */

import { DiscoveryHero } from '../components/DiscoveryHero';
import { DiscoveryProductCard } from '../components/DiscoveryProductCard';
import { SubscriptionConfirmModal } from '../components/SubscriptionConfirmModal';
import '../discovery.css';

export const BrowsePage = () => {
    const navigate = useNavigate();
    const { setPageTitle } = useStore();

    useEffect(() => {
        setPageTitle('Browse APIs');
    }, [setPageTitle]);

    // --- Store Integration ---
    const { getToken } = useAuth();
    const {
        user,
        products: allProducts,
        subscriptions: allSubscriptions,
        teams: allTeams,
        addSubscription
    } = useStore();

    // --- UI State ---
    const [selectedTeamId, setSelectedTeamId] = useState<string>(user?.teams[0] || '');
    const [searchQuery, setSearchQuery] = useState('');
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
    const availableProducts = useMemo(() =>
        allProducts.filter(p => !activeSubscriptionProductIds.includes(p.id))
        , [allProducts, activeSubscriptionProductIds]);

    const filteredProducts = useMemo(() =>
        availableProducts.filter(p =>
            p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        , [availableProducts, searchQuery]);

    // --- Handlers ---
    const handleSubscribeInitiate = (productId: string) => {
        setSelectedProductId(productId);
        setShowSubscribeModal(true);
    };

    const handleConfirmSubscription = () => {
        if (!selectedProductId || !selectedTeamId) return;

        addSubscription(selectedProductId, selectedTeamId, getToken);
        setShowSubscribeModal(false);

        // Navigation gives feedback of progress
        navigate('/');
    };

    return (
        <MainLayout>
            <DiscoveryHero
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
            />

            {/* Catalog Grid */}
            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="mb-10 flex items-center gap-4">
                    <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {filteredProducts.length} Assets available for integration
                    </p>
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="bg-gray-50/50 dark:bg-slate-800/20 rounded-[3rem] p-24 text-center border-2 border-dashed border-gray-100 dark:border-slate-800 transition-all">
                        <div className="text-7xl mb-6 opacity-40">🛸</div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter">Inventory Empty</h3>
                        <p className="text-gray-400 dark:text-slate-500 font-medium">No results match your current search parameters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {filteredProducts.map(product => (
                            <DiscoveryProductCard
                                key={product.id}
                                product={product}
                                ownerTeam={allTeams.find(t => t.id === product.ownerTeamId)}
                                onSubscribe={handleSubscribeInitiate}
                            />
                        ))}
                    </div>
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

