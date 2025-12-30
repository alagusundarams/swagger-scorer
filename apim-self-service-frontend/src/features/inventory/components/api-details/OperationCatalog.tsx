/**
 * OperationCatalog
 * 
 * Lists all operations (endpoints) available for a specific API.
 * Allows users to filter and select operations for detailed viewing.
 */
import { Link } from 'react-router-dom';
import { type API } from '../../types/inventoryTypes';

interface OperationCatalogProps {
    productId: string;
    api: API;
}

export function OperationCatalog({ productId, api }: OperationCatalogProps) {
    const methodColors = {
        GET: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
        POST: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
        PUT: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',
        PATCH: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800',
        DELETE: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',
    };

    return (
        <main className="max-w-7xl mx-auto px-6 py-16">
            <div className="flex items-center gap-4 mb-10">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Operation Catalog</h2>
            </div>

            <div className="max-h-[600px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(api.operations || []).map((op) => (
                        <Link
                            key={op.id}
                            to={`/products/${productId}/apis/${api.id}/operations/${op.id}`}
                            className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/50 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all group flex flex-col justify-between min-h-[160px]"
                        >
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${methodColors[op.method as keyof typeof methodColors] || 'bg-gray-100 text-gray-600'}`}>
                                        {op.method}
                                    </span>
                                    <span className="text-[10px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest">
                                        Operation
                                    </span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-emerald-500 transition-colors mb-2">
                                    {op.displayName || op.urlTemplate}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {op.description}
                                </p>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-slate-700/30 flex items-center justify-between">
                                <span className="text-[9px] font-mono text-gray-400 dark:text-slate-500 tracking-tight">
                                    {op.urlTemplate}
                                </span>
                                <span className="text-lg opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-500 font-bold">→</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
