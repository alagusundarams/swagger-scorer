import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';

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
    const { products } = useStore();

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
            {/* API Identity Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-900/40">
                                ⚡ API RESOURCE NODE
                            </span>
                        </div>
                        <div className="flex justify-between items-end mb-6">
                            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                                {api.displayName}
                            </h1>
                            <button
                                onClick={() => {
                                    const breadcrumbContext = [
                                        { label: product.displayName, href: `/products/${productId}` },
                                        { label: api.displayName, href: `/products/${productId}/apis/${apiId}` }
                                    ];

                                    const navState = {
                                        startWithSpec: `openapi: 3.0.0
info:
  title: ${api.displayName}
  version: 1.0.0
paths: {}
# Loaded from Product Inventory
`,
                                        breadcrumbContext
                                    };

                                    // Persist breadcrumbs for browser refresh
                                    sessionStorage.setItem('analyzerBreadcrumbs', JSON.stringify(breadcrumbContext));

                                    navigate('/analyzer', { state: navState });
                                }}
                                className="px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-slate-700"
                            >
                                <span className="text-lg">⚡</span> Analyze Spec
                            </button>
                        </div>
                        <p className="text-gray-500 dark:text-slate-400 text-lg max-w-3xl leading-relaxed font-medium">
                            {api.description || (
                                <span className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl text-amber-700 dark:text-amber-500 text-sm font-bold">
                                    ⚠️ Governance Alert: This interface lacks a functional description. Please update the registry metadata.
                                </span>
                            )}
                        </p>


                        {/* Deployment Context */}
                        <div className="flex flex-wrap items-center gap-8 mt-10 p-6 bg-gray-50/50 dark:bg-slate-800/40 rounded-[2rem] border border-gray-100 dark:border-slate-700/30">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Base Routing Path</span>
                                <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                                    {api.path || <span className="text-red-500">UNASSIGNED_ROUTE</span>}
                                </span>
                            </div>
                            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700/50 hidden md:block"></div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Endpoint Density</span>
                                <span className="text-sm font-black text-gray-900 dark:text-white">{api.operations.length} Managed Operations</span>
                            </div>
                            <div className="w-px h-8 bg-gray-200 dark:bg-slate-700/50 hidden md:block"></div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Parent Product</span>
                                <Link to={`/products/${product.id}`} className="text-sm font-black text-gray-900 dark:text-white hover:text-blue-600 transition-colors underline decoration-gray-200 underline-offset-4">
                                    {product.displayName}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operation Explorer */}
            <main className="max-w-7xl mx-auto px-6 py-16">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Operation Catalog</h2>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {api.operations.map(operation => {
                        // Semantic coloring for standard HTTP verbs
                        const methodColors = {
                            GET: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
                            POST: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
                            PUT: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',
                            PATCH: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800',
                            DELETE: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',
                        };

                        return (
                            <Link
                                key={operation.id}
                                to={`/products/${productId}/apis/${apiId}/operations/${operation.id}`}
                                className="group block p-6 bg-white dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-700/30 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-premium transition-all"
                            >
                                <div className="flex items-center gap-8">
                                    <span className={`w-24 text-center py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest ${methodColors[operation.method]}`}>
                                        {operation.method}
                                    </span>
                                    <div className="flex-1">
                                        <p className="font-mono text-sm font-black text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                                            {operation.urlTemplate}
                                        </p>
                                        <p className="text-sm text-gray-400 font-medium line-clamp-1">{operation.description}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center text-gray-300 group-hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0">
                                        →
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </main>
        </MainLayout>
    );
};
