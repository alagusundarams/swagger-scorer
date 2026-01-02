
import React from 'react';
import { ApiOperation } from '../../../../utils/swaggerParser';
import { OperationPolicyState } from '../usePolicyStudio';

interface PolicyExplorerProps {
    operations: ApiOperation[];
    selectedOpId: string | null;
    setSelectedOpId: (id: string | null) => void;
    policies: Record<string, OperationPolicyState>;
}

export const PolicyExplorer: React.FC<PolicyExplorerProps> = ({
    operations,
    selectedOpId,
    setSelectedOpId,
    policies
}) => {
    return (
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-sm z-10">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Scope Explorer</h3>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Select where to apply policies</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                {/* Product Scope */}
                <button
                    onClick={() => setSelectedOpId('product')}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedOpId === 'product'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20 px-4'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-lg">📦</span>
                        <div className="text-left">
                            <p className="text-xs font-black uppercase">Product Policy</p>
                            <p className={`text-[9px] font-bold ${selectedOpId === 'product' ? 'text-purple-200' : 'text-slate-400'}`}>Shared across all APIs</p>
                        </div>
                    </div>
                    {policies['product']?.isOverridden && (
                        <div className={`w-2 h-2 rounded-full ${selectedOpId === 'product' ? 'bg-white' : 'bg-purple-500'} shadow-glow`} />
                    )}
                </button>

                {/* API Level */}
                <button
                    onClick={() => setSelectedOpId('global')}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedOpId === 'global'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 px-4'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-lg">🌐</span>
                        <div className="text-left">
                            <p className="text-xs font-black uppercase">API Level</p>
                            <p className={`text-[9px] font-bold ${selectedOpId === 'global' ? 'text-blue-200' : 'text-slate-400'}`}>All operations in this API</p>
                        </div>
                    </div>
                </button>

                <div className="my-4 border-t border-slate-100 dark:border-slate-800" />

                <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Operations</p>

                {operations.filter(o => o.id !== 'global').map(op => (
                    <button
                        key={op.id}
                        onClick={() => setSelectedOpId(op.id || null)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedOpId === op.id
                                ? 'bg-slate-800 text-white shadow-lg px-4'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${op.method === 'GET' ? 'bg-green-100 text-green-700' :
                                    op.method === 'POST' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'
                                }`}>
                                {op.method}
                            </span>
                            <div className="text-left overflow-hidden">
                                <p className="text-[10px] font-black truncate">{op.path}</p>
                                <p className="text-[9px] text-slate-400 truncate opacity-70">{op.summary || 'No summary'}</p>
                            </div>
                        </div>
                        {policies[op.id || '']?.isOverridden && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
