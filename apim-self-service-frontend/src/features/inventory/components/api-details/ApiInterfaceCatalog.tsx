/**
 * ApiInterfaceCatalog
 * 
 * A comprehensive list of all APIs associated with a Product.
 * Allows users to view, search, and select specific APIs implementation details.
 */
import { useState } from 'react';
import { type Product, type API } from '../../types/inventoryTypes';

interface ApiInterfaceCatalogProps {
    product: Product;
    onViewContract?: (api: API) => void;
    onManage?: (api: API) => void;
}

/**
 * ApiInterfaceCatalog Component
 * 
 * **Purpose**: Consumer-facing list of APIs.
 * **Permission**: READ-ONLY.
 * **Features**: Drill-down to operations, view documentation, and VIEW CONTRACT.
 */
export function ApiInterfaceCatalog({ product, onViewContract, onManage }: ApiInterfaceCatalogProps) {
    const [expandedApi, setExpandedApi] = useState<string | null>(null);

    return (
        <div className="mb-12">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-1 h-8 bg-emerald-600 rounded-full"></div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Interface Catalog</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {product.apis.map((api) => {
                    const isExpanded = expandedApi === api.id;
                    return (
                        <div
                            key={api.id}
                            className={`bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-slate-700/30 overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-emerald-500/20 shadow-xl' : 'hover:border-emerald-100 dark:hover:border-emerald-900/30'
                                }`}
                        >
                            <div
                                className="p-8 flex items-center justify-between cursor-pointer"
                                onClick={() => setExpandedApi(isExpanded ? null : api.id)}
                            >
                                <div className="flex items-center gap-8">
                                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-center text-xl">
                                        📡
                                    </div>
                                    <div>
                                        <h3
                                            className={`text-lg font-black text-gray-900 dark:text-white mb-1 ${onManage ? 'hover:text-emerald-600 cursor-pointer transition-colors' : ''}`}
                                            onClick={(e) => {
                                                if (onManage) {
                                                    e.stopPropagation();
                                                    onManage(api);
                                                }
                                            }}
                                        >
                                            {api.displayName}
                                        </h3>
                                        <p className="text-sm text-gray-400 font-medium">
                                            Base Path: <code className="text-emerald-500 font-mono italic">{api.path || '/'}</code>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    {onManage && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onManage(api);
                                            }}
                                            className="hidden md:block px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 dark:border-blue-800/50 hover:bg-blue-100 transition-colors"
                                        >
                                            Manage
                                        </button>
                                    )}

                                    {onViewContract && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewContract(api);
                                            }}
                                            className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-emerald-100 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors"
                                        >
                                            View Source ⚡
                                        </button>
                                    )}
                                    <div className="text-right hidden md:block">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Endpoints</p>
                                        <span className="text-sm font-bold text-gray-500">{api.operations.length} Managed</span>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full border border-gray-100 dark:border-slate-700 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-emerald-50 dark:bg-slate-700 border-emerald-200 text-emerald-600' : 'text-gray-300'}`}>
                                        ↓
                                    </div>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="px-8 pb-8 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-50 dark:border-slate-700/30 animate-fade-in text-gray-900 dark:text-white">
                                    <div className="pt-6">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Available Operations</h4>
                                        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-slate-700">
                                            {api.operations.map((op, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/30">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${op.method === 'GET' ? 'bg-blue-100 text-blue-600' :
                                                        op.method === 'POST' ? 'bg-green-100 text-green-600' :
                                                            'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {op.method}
                                                    </span>
                                                    <span className="text-sm font-mono text-gray-700 dark:text-slate-300">{op.urlTemplate || '/'}</span>
                                                    <div className="ml-auto text-xs text-gray-400 font-medium italic truncate max-w-[300px] flex items-center gap-2">
                                                        <span>{op.displayName || 'No description'}</span>
                                                        <span className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors cursor-help" title="View details">ℹ️</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
