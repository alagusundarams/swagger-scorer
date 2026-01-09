
import { useMemo } from 'react';
import { type NamedValue } from '../../types/inventoryTypes';
import { useNamedValuesQuery } from '../../api/inventoryQueries';

interface ApiCredentialsTabProps {
    productId: string;
    apiId: string;
}

/**
 * ApiCredentialsTab
 * 
 * Shows Named Values (Secrets/Credentials) specifically scoped to this API.
 * This replaces the incorrect display of product-level subscriptions at the API level.
 */
export const ApiCredentialsTab = ({ productId, apiId }: ApiCredentialsTabProps) => {
    const { data: allNamedValues = [], isLoading } = useNamedValuesQuery(productId);

    // Filter for values scoped specifically to this API
    const apiSecrets = useMemo(() => {
        return (allNamedValues as NamedValue[]).filter((nv: NamedValue) => nv.scopeId === apiId);
    }, [allNamedValues, apiId]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-premium border border-gray-100 dark:border-slate-700/30 animate-fade-in">
            <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">API Credentials</h2>
                <p className="text-gray-500 dark:text-slate-400 font-medium text-sm">
                    Named values and secrets used specifically by this API's policies.
                </p>
            </div>

            {apiSecrets.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {apiSecrets.map((nv: NamedValue) => (
                        <div key={nv.id} className="p-6 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">System Name</span>
                                    <code className="text-xs font-mono font-bold text-gray-900 dark:text-white">{`{{${nv.systemName}}}`}</code>
                                </div>
                                <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">{nv.displayName}</h3>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-2 justify-end mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${nv.isSecret ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {nv.isSecret ? '🔒 Secret' : '📄 Literal'}
                                    </span>
                                    {nv.type === 'key_vault' && (
                                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[8px] font-black uppercase">
                                            Vault Linked
                                        </span>
                                    )}
                                </div>
                                <code className="text-[10px] font-mono text-gray-400">
                                    {nv.isSecret ? 'Value Encrypted' : nv.value}
                                </code>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-slate-800/50 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl p-12 text-center">
                    <div className="text-3xl mb-4">🔑</div>
                    <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">No API-Specific Credentials</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-2">
                        This API uses product-level configuration or has no specific secrets defined.
                    </p>
                </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-500 rounded-r-xl">
                <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    <strong>Note:</strong> Product-level subscriptions and keys are managed at the <a href={`/products/${productId}`} className="underline font-bold">Product level</a>.
                    Only configuration referenced via <code>{"{{name}}"}</code> syntax in your XML policy is shown here.
                </p>
            </div>
        </div>
    );
};
