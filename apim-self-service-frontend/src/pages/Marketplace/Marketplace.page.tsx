import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../store/useStore';
import { useProductsQuery } from '../../features/inventory/api/inventoryQueries';

/**
 * MarketplacePage Controller
 * 
 * ------------------------------------------------------------------
 * 📍 Purpose:
 * Route Entry Point for `/marketplace`.
 * The "Sales/Management" Persona View for discovering available services.
 * 
 * 🔄 Data Flow:
 * 1. `useInventoryStore` -> Fetches ALL products.
 * 2. `useStore` -> Fetches User Entitlements (Teams).
 * 3. Logic -> Filters Products based on Entitlements (Public vs Private vs Authorized Teams).
 * 4. `filterUtils` -> Applies client-side text search and category filtering.
 * 
 * 🧩 MFE Boundaries:
 * - This Page orchestrates the "Inventory" feature (Catalog) and "Auth" (Entitlements).
 * - It serves as the primary "browsing" experience for internal services.
 * ------------------------------------------------------------------
 */
export const MarketplacePage = () => {
    const navigate = useNavigate();
    const { user, setPageTitle } = useStore();
    const { data: products = [] } = useProductsQuery();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [selectedEnv, setSelectedEnv] = useState<string>('ALL');

    useEffect(() => {
        setPageTitle('Marketplace');
    }, [setPageTitle]);

    // --- Entitlement Logic ---
    /**
     * Determines which products are visible to the current user.
     * 
     * Security Rules:
     * 1. Ownership: Users always see products they own.
     * 2. Public: Visible to everyone.
     * 3. Private: Only visible if the user's team is explicitly in `authorizedTeams`.
     */
    const accessibleProducts = useMemo(() => {
        if (!user) return [];
        return products.filter(product => {
            // 1. Owners always see their own products
            if (user.teams.includes(product.ownerTeamId)) return true;

            // 2. Public products are visible to everyone
            if (product.visibility === 'public') return true;

            // 3. Private products check the Authorized Teams list
            if (product.visibility === 'private' && product.authorizedTeams?.some(teamId => user.teams.includes(teamId))) {
                return true;
            }

            // 4. Otherwise, hidden
            return false;
        });
    }, [products, user]);

    // --- Filter Logic ---
    const filteredProducts = useMemo(() => {
        let result = accessibleProducts;

        if (selectedType !== 'ALL') {
            result = result.filter(p => (p.type || 'standard').toUpperCase() === selectedType);
        }

        if (selectedEnv !== 'ALL') {
            result = result.filter(p => p.environment === selectedEnv);
        }

        return result;
    }, [accessibleProducts, selectedType, selectedEnv]);

    // --- Search Filter ---
    const displayedProducts = useMemo(() => {
        if (!searchTerm.trim()) return filteredProducts;
        const lowerTerm = searchTerm.toLowerCase();
        return filteredProducts.filter(p =>
            p.displayName.toLowerCase().includes(lowerTerm) ||
            p.description.toLowerCase().includes(lowerTerm) ||
            p.name.toLowerCase().includes(lowerTerm) ||
            p.apis.some(api => api.path.toLowerCase().includes(lowerTerm) || api.displayName.toLowerCase().includes(lowerTerm))
        );
    }, [filteredProducts, searchTerm]);

    return (
        <MainLayout>
            <div className="bg-slate-900 text-white pb-32 pt-20 px-6 relative overflow-hidden">
                {/* Hero Background */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <h1 className="text-5xl font-black tracking-tighter mb-6">Service Marketplace</h1>
                    <p className="text-xl text-slate-400 max-w-2xl font-medium mb-12">
                        Discover authorized API products available for your team.
                        This catalog is filtered based on your organizational entitlements.
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-2xl">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <span className="text-2xl">🔍</span>
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by Business Domain, Capability, or Value Stream..."
                            className="w-full pl-16 pr-6 py-6 bg-white/10 backdrop-blur-md border border-white/30 rounded-3xl text-white placeholder-slate-400 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-2xl"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-20 pb-20">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Sidebar Filters */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-slate-700/50 sticky top-24">
                            <div className="mb-8">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Resource Type</h4>
                                <div className="space-y-2">
                                    {['ALL', 'STANDARD', 'GRP'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedType(type)}
                                            className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedType === type
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {selectedType === type && <span className="mr-2">✓</span>}
                                            {type.charAt(0) + type.slice(1).toLowerCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Environment</h4>
                                <div className="space-y-2">
                                    {['ALL', 'DEV', 'QA', 'STAGE', 'PROD'].map(env => (
                                        <button
                                            key={env}
                                            onClick={() => setSelectedEnv(env)}
                                            className={`w-full text-left px-4 py-2 rounded-xl text-sm font-bold transition-all ${selectedEnv === env
                                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                                }`}
                                        >
                                            {selectedEnv === env && <span className="mr-2">●</span>}
                                            {env}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => { setSelectedType('ALL'); setSelectedEnv('ALL'); setSearchTerm(''); }}
                                className="w-full mt-8 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100 rounded-xl hover:bg-blue-50 transition"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {displayedProducts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {displayedProducts.map(product => (
                                    <div
                                        key={product.id}
                                        onClick={() => navigate(`/products/${product.id}`)}
                                        className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-slate-700/50 hover:scale-[1.02] hover:shadow-2xl transition-all cursor-pointer group flex flex-col h-full"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-16 h-16 bg-blue-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                {product.type === 'grp' ? '📦' : '🧩'}
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${product.visibility === 'public' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    product.visibility === 'private' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {product.visibility || 'Public'}
                                                </span>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase tracking-tighter">
                                                    {product.environment}
                                                </span>
                                            </div>
                                        </div>

                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight group-hover:text-blue-600 transition-colors">
                                            {product.displayName}
                                        </h3>
                                        <p className="text-gray-500 dark:text-slate-400 font-medium line-clamp-3 mb-8 flex-grow">
                                            {product.description}
                                        </p>

                                        <div className="pt-6 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                                                <span>v{product.version}</span>
                                                <span>•</span>
                                                <span>{product.ownerTeamId.replace('team-', '').toUpperCase()}</span>
                                            </div>
                                            <span className="text-blue-600 font-bold group-hover:translate-x-2 transition-transform">→</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-32 opacity-50 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200">
                                <div className="text-6xl mb-6">🏝️</div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-widest mb-2">No Authorized Services Found</h2>
                                <p className="text-gray-500 font-medium">
                                    {searchTerm ? `No results match "${searchTerm}" within your permitted scope.` : "Try adjusting your filters to find more services."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout >
    );
};
