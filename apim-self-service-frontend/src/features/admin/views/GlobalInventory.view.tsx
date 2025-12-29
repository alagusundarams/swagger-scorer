import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../api/baseClient';

/**
 * Global Inventory View
 * 
 * Shows cross-origin products and shared APIs for Admin users.
 */
export const GlobalInventory = ({ embedded = false }: { embedded?: boolean }) => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState<{ products: any[], apis: any[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <div className="p-10 bg-white dark:bg-slate-800 rounded-[3rem] shadow-premium border border-gray-100 dark:border-slate-700/30">
            {!embedded && (
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-2 capitalize">Global Inventory</h1>
                        <p className="text-gray-400 dark:text-slate-500 font-medium">Cross-boundary monitoring of products and APIs.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/admin/mapping')}
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

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Hydrating Global State...</p>
                </div>
            ) : inventory && inventory.products.length > 0 ? (
                <div className="space-y-12">
                    <section>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-blue-500 mb-6 flex items-center gap-3">
                            <span className="w-8 h-px bg-blue-500/30"></span>
                            Unified Products
                        </h2>
                        <div className="grid grid-cols-1 gap-4">
                            {inventory.products.map((p) => (
                                <div
                                    key={p.name}
                                    onClick={() => navigate(`/directory/product/${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-001`)} // Assuming standard ID format or using mocked ID
                                    className="cursor-pointer p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between hover:border-blue-500 hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-xl">
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
                                                    key={d.environment}
                                                    title={`${d.environment}: ${d.state}`}
                                                    className={`w-8 h-8 rounded-lg border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black ${d.environment === 'PROD' ? 'bg-indigo-600 text-white' :
                                                        d.environment === 'QA' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                                                        }`}
                                                >
                                                    {d.environment[0]}
                                                </div>
                                            ))}
                                        </div>
                                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${p.deployments.every((d: any) => d.reconciliationStatus === 'RECONCILED')
                                            ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                            {p.deployments.every((d: any) => d.reconciliationStatus === 'RECONCILED') ? 'Synced' : 'Drifted'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                            <span className="w-8 h-px bg-slate-200 dark:bg-slate-700"></span>
                            Managed API Interfaces
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
                                    {inventory.apis.map((a) => (
                                        <tr
                                            key={a.name}
                                            onClick={() => navigate(`/directory/product/${a.productId}`)} // Assuming we can link back to product, as API detail might not exist yet
                                            className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-200">{a.displayName}</td>
                                            <td className="px-6 py-4">
                                                <code className="text-[10px] bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-blue-600">{a.path}</code>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {a.deployments.map((d: any) => (
                                                        <span key={d.environment} className="text-[10px] font-black text-slate-400 uppercase">{d.environment}</span>
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
                        </div>
                    </section>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    <div className="p-20 border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-[3rem] flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-4xl mb-8 group-hover:scale-110 transition-transform">
                            📦
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Inventory Empty</h3>
                        <p className="text-gray-500 max-w-sm font-medium">No cross-origin products have been discovered in the connected clusters yet.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
