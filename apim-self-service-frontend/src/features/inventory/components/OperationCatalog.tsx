import { Link } from 'react-router-dom';
import { type API } from '../../../types/entities';

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

            <div className="grid grid-cols-1 gap-4">
                {api.operations.map(operation => (
                    <Link
                        key={operation.id}
                        to={`/products/${productId}/apis/${api.id}/operations/${operation.id}`}
                        className="group block p-6 bg-white dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-700/30 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-premium transition-all"
                    >
                        <div className="flex items-center gap-8">
                            <span className={`w-24 text-center py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest ${methodColors[operation.method as keyof typeof methodColors]}`}>
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
                ))}
            </div>
        </main>
    );
}
