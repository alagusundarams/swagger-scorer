import { ApiOperation } from '../../../utils/swaggerParser';
import { OperationPolicyState } from './usePolicyStudio';

/**
 * ------------------------------------------------------------------
 * 📍 Component: PolicyExplorer
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Provides the contextual navigation for the Policy Studio.
 * - Switches between "Product Scope" and specific "API Operations".
 * - Visualizes which operations already have policies applied (Scanned State).
 * 
 * 📤 ACTIONS:
 * - `setSelectedOpId`: Updates the shared orchestration state to focus 
 *   the editor on a different scope.
 * ------------------------------------------------------------------
 */
interface PolicyExplorerProps {
    operations: ApiOperation[];
    selectedOpId: string | null;
    setSelectedOpId: (id: string) => void;
    scanned: boolean;
    policies: Record<string, OperationPolicyState>;
}

export const PolicyExplorer = ({
    operations,
    selectedOpId,
    setSelectedOpId,
    scanned,
    policies
}: PolicyExplorerProps) => {
    return (
        <div className="w-1/3 min-w-[250px] max-w-[350px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-0">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 flex justify-between items-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">Policy Explorer</p>
                <div className="text-[10px] text-slate-300 font-mono">TREE VIEW</div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-2 space-y-1">
                    {/* Product Scope Item */}
                    <button
                        onClick={() => setSelectedOpId('product')}
                        className={`w - full text - left p - 3 rounded - lg flex items - center gap - 3 transition - colors ${selectedOpId === 'product'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30 shadow-sm'
                            : 'hover:bg-slate-50 text-slate-600 dark:text-slate-400 border border-transparent'
                            } `}
                    >
                        <div className={`w - 2 h - 2 rounded - full ${policies['product']?.activePolicies?.length ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'} `} />
                        <span className="text-[10px] font-bold uppercase tracking-wider flex-1">PRODUCT SCOPE</span>
                        {selectedOpId === 'product' && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </button>

                    <div className="my-2 border-t border-slate-100 dark:border-slate-800 mx-2" />

                    {!scanned ? (
                        <div className="p-4 text-center text-slate-400 text-xs animate-pulse">Scanning API Structure...</div>
                    ) : (
                        <div className="space-y-0.5">
                            {operations.map((op) => {
                                const isActive = selectedOpId === op.id;
                                const isConfigured = (policies[op.id]?.activePolicies?.length || 0) > 0;
                                const isGlobal = op.id === 'global';

                                return (
                                    <button
                                        key={op.id}
                                        onClick={() => setSelectedOpId(op.id)}
                                        className={`w - full text - left px - 3 py - 2.5 rounded - md flex items - center gap - 3 transition - all relative group ${isActive
                                            ? 'bg-purple-50 text-purple-900 font-medium dark:bg-purple-900/20 dark:text-purple-100 shadow-sm z-10'
                                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900'
                                            } `}
                                    >
                                        {!isGlobal && (
                                            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 transaction-colors" />
                                        )}
                                        <div className={`
min - w - [40px] h - 5 flex items - center justify - center text - [9px] font - black rounded border tracking - wide
                                                ${isGlobal ? 'bg-slate-800 text-white border-slate-900' :
                                                op.method === 'GET' ? 'bg-sky-100 text-sky-700 border-sky-200' :
                                                    op.method === 'POST' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                        op.method === 'DELETE' ? 'bg-red-100 text-red-700 border-red-200' :
                                                            'bg-amber-100 text-amber-700 border-amber-200'
                                            }
`}>
                                            {op.method}
                                        </div>
                                        <span className="text-[10px] truncate">{op.path}</span>
                                        {isConfigured && <div className="w-1 h-1 rounded-full bg-purple-500 ml-auto" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
