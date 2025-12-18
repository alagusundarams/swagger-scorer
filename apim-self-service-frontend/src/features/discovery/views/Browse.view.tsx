import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth/hooks/useAuth';
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

export const BrowsePage = () => {
    const navigate = useNavigate();

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

        // Create new pending subscription in the store


        addSubscription(selectedProductId, selectedTeamId, getToken);
        setShowSubscribeModal(false);

        // Navigation gives feedback of progress
        navigate('/');
    };

    return (
        <MainLayout>
            {/* Header / Search Region */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800/60 transition-all">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                        <div>
                            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">Discovery Hub</h1>
                            <p className="text-gray-400 dark:text-slate-500 text-lg font-medium">Explore and integrate with high-quality API assets</p>
                        </div>
                        <Link
                            to="/"
                            className="px-6 py-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:shadow-premium transition-all shrink-0"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>

                    {/* Filter Input */}
                    <div className="relative group max-w-4xl">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-2xl group-focus-within:scale-110 transition-transform">
                            🔍
                        </div>
                        <input
                            type="search"
                            placeholder="Find by name, capability, or owner..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-16 pr-8 py-6 bg-gray-50 dark:bg-slate-800 border border-transparent dark:border-slate-700/50 rounded-3xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-8 focus:ring-blue-500/5 transition-all shadow-inner text-lg font-medium"
                        />
                    </div>
                </div>
            </div>

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
                        {filteredProducts.map(product => {
                            const ownerTeam = allTeams.find(t => t.id === product.ownerTeamId);
                            return (
                                <div
                                    key={product.id}
                                    className="group bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 border border-gray-100 dark:border-slate-700/30 shadow-sm hover:shadow-premium hover:border-blue-100 dark:hover:border-blue-900/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                                                📦
                                            </div>
                                            <span className="bg-gray-50 dark:bg-slate-900 px-3 py-1 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-slate-800">
                                                {product.version}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{product.displayName}</h3>
                                        {ownerTeam && (
                                            <p className="text-[10px] font-black text-gray-300 dark:text-slate-500 uppercase tracking-widest mb-4">OWNED BY {ownerTeam.name}</p>
                                        )}
                                        <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-3 font-medium mb-8 leading-relaxed">{product.description}</p>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-50 dark:border-slate-700/30">
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Interfaces</p>
                                                <span className="text-xs font-black text-gray-700 dark:text-white">{product.apis.length}</span>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Impact</p>
                                                <span className="text-xs font-black text-gray-700 dark:text-white">{product.subscriberCount || 0} teams</span>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Quality</p>
                                                <span className="text-xs font-black text-emerald-500">{product.qualityScore}%</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <Link
                                                to={`/products/${product.id}`}
                                                className="flex-1 px-6 py-4 bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-center transition-all"
                                            >
                                                Analyze
                                            </Link>
                                            <button
                                                onClick={() => handleSubscribeInitiate(product.id)}
                                                className="flex-[2] px-6 py-4 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                                            >
                                                Subscribe Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Subscription Access Gateway (Modal) */}
            {showSubscribeModal && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 max-w-lg w-full shadow-2xl transform scale-100 relative overflow-hidden">
                        {/* Decorative background element */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>

                        <div className="relative">
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 capitalize">Initiate Integration</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                                Requesting access for <span className="text-blue-600 font-bold">{allProducts.find(p => p.id === selectedProductId)?.displayName}</span>.
                                Subscriptions require owner verification before keys are issued.
                            </p>

                            <div className="space-y-10">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">
                                        RECIPIENT CONSUMER TEAM
                                    </label>
                                    <select
                                        value={selectedTeamId}
                                        onChange={e => setSelectedTeamId(e.target.value)}
                                        className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-700/50 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                                    >
                                        {userTeams.map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6">
                                    <p className="text-xs text-amber-700 dark:text-amber-500 font-bold leading-relaxed">
                                        ⚠️ GOVERNANCE ALERT: This action triggers an approval workflow. Expected processing time is ~24-48 business hours.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowSubscribeModal(false)}
                                        className="flex-1 px-8 py-5 border border-gray-100 dark:border-slate-700 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmSubscription}
                                        className="flex-[2] px-8 py-5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all"
                                    >
                                        Submit Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
