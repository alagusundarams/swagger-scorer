import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/baseClient';
import { filterGlobalProducts, filterGlobalApis } from '../../utils/filterUtils';
import { getEnvironmentTheme, getStatusTheme } from '../../utils/statusUtils';

/**
 * Global Inventory View
 * 
 * Shows cross-origin products and shared APIs for Admin users.
 */
export const GlobalInventory = ({ embedded = false }: { embedded?: boolean }) => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState<{ products: any[], apis: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Filter & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEnv, setSelectedEnv] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const res = await api.get('/admin/global-inventory');
                setInventory(res.data);
            } catch (err) {
                console.error('Failed to fetch global inventory:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchInventory();
    }, []);

    // Derived State: Filtering
    const filteredProducts = useMemo(() => {
        if (!inventory) return [];
        return filterGlobalProducts(inventory.products, searchTerm, selectedEnv);
    }, [inventory, searchTerm, selectedEnv]);

    const filteredApis = useMemo(() => {
        if (!inventory) return [];
        return filterGlobalApis(inventory.apis, searchTerm, selectedEnv);
    }, [inventory, searchTerm, selectedEnv]);

    // Derived State: Pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredProducts.slice(start, start + itemsPerPage);
    }, [filteredProducts, currentPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedEnv]);

    return (
        <div className="p-10 bg-white dark:bg-slate-800 rounded-[3rem] shadow-premium border border-gray-100 dark:border-slate-700/30 min-h-[600px]">
            {!embedded && (
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-2 capitalize">Global Inventory</h1>
                        <p className="text-gray-400 dark:text-slate-500 font-medium">Authoritative monitoring of cross-environment resources.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/admin/governance')}
                            className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2"
                        >
                            <span>⚠️</span>
                            <span>Manage Orphans</span>
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="px-6 py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all"
                        >
                            ← Dashboard
                        </button>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-4 mb-8 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by name, path or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Environment</span>
                    <select
                        value={selectedEnv}
                        onChange={(e) => setSelectedEnv(e.target.value)}
                        className="bg-white dark:bg-slate-800 border-none rounded-xl text-xs font-bold py-3 px-6 shadow-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">All Environments</option>
                        <option value="DEV">Development</option>
                        <option value="QA">QA / Testing</option>
                        <option value="STAGE">Staging</option>
                        <option value="PROD">Production</option>
                    </select>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Showing {paginatedProducts.length} of {filteredProducts.length} Products
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Hydrating Global State...</p>
                </div>
            ) : filteredProducts.length > 0 ? (
                <div className="space-y-12">
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 mb-6 flex items-center gap-3">
                            <span className="w-8 h-px bg-blue-500/30"></span>
                            Unified Products
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {paginatedProducts.map((p) => (
                                <div
                                    key={p.name}
                                    onClick={() => navigate(`/products/${p.name}`)}
                                    className="cursor-pointer p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between hover:border-blue-500 hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-xl group-hover:scale-110 transition-transform">
                                            📦
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 dark:text-white">{p.displayName}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{p.ownerTeamName || 'Unassigned'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="flex -space-x-2">
                                            {p.deployments.map((d: any) => (
                                                <div
                                                    key={d.id}
                                                    title={`${d.environment}: ${d.state}`}
                                                    className={`w-8 h-8 rounded-lg border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black transition-transform hover:scale-125 hover:z-10 cursor-help ${getEnvironmentTheme(d.environment).bg} ${getEnvironmentTheme(d.environment).text}`}
                                                >
                                                    {d.environment[0]}
                                                </div>
                                            ))}
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${getStatusTheme(p.deployments.every((d: any) => d.reconciliationStatus === 'RECONCILED') ? 'synced' : 'drifted').bg} ${getStatusTheme(p.deployments.every((d: any) => d.reconciliationStatus === 'RECONCILED') ? 'synced' : 'drifted').text}`}>
                                            {p.deployments.every((d: any) => d.reconciliationStatus === 'RECONCILED') ? 'Synced' : 'Drifted'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-8 flex items-center justify-center gap-2">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => prev - 1)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-30 hover:bg-slate-200 transition-all"
                                >
                                    Previous
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === i + 1
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                        >
                                            {i + 1}
                                        </button>
                                    )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                                </div>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(prev => prev + 1)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-30 hover:bg-slate-200 transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                            <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
                            Managed API Interfaces ({filteredApis.length})
                        </h2>
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">API Name</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Path</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Environments</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Health</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                    {filteredApis.slice(0, 50).map((a) => (
                                        <tr
                                            key={a.name}
                                            onClick={() => navigate(`/products/${a.deployments[0]?.productId}`)}
                                            className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-200">{a.displayName}</td>
                                            <td className="px-6 py-4">
                                                <code className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-blue-600 font-mono">{a.path}</code>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {a.deployments.map((d: any) => (
                                                        <span key={d.id} className="text-[10px] font-black text-slate-400 uppercase">{d.environment}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="inline-block w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredApis.length > 50 && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/30 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Showing top 50 APIs. Use search to find specific interfaces.
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <div className="p-20 border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-[3rem] flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-4xl mb-8">
                            🔍
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Matching Resources</h3>
                        <p className="text-gray-500 max-w-sm font-medium">Try adjusting your filters or search term to discover inventory items.</p>
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedEnv('ALL'); }}
                            className="mt-6 text-blue-600 font-bold hover:underline"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
