import { useState } from 'react';
import type { Subscription } from '../../../shared/types/domain';
import { useQueryClient } from '@tanstack/react-query';
import { consumerKeys } from '../../consumer/api/consumerQueries';
import { consumerApi } from '../../consumer/api/consumerClient';

interface CredentialsTabProps {
    subscriptions: Subscription[];
}

export function CredentialsTab({ subscriptions }: CredentialsTabProps) {
    const queryClient = useQueryClient();
    const [visibleKeys, setVisibleKeys] = useState<Record<string, { primary: string; secondary: string }>>({});
    const [loadingSubId, setLoadingSubId] = useState<string | null>(null);

    const handleToggleKey = async (subId: string) => {
        if (visibleKeys[subId]) {
            // Hide
            const next = { ...visibleKeys };
            delete next[subId];
            setVisibleKeys(next);
            return;
        }

        // Fetch and show
        setLoadingSubId(subId);
        try {
            const secrets = await queryClient.fetchQuery({
                queryKey: consumerKeys.secrets(subId),
                queryFn: () => consumerApi.getSubscriptionSecrets(subId),
                staleTime: 1000 * 60 * 5,
            });

            if (secrets) {
                setVisibleKeys({
                    ...visibleKeys,
                    [subId]: { primary: secrets.primaryKey, secondary: secrets.secondaryKey }
                });
            }
        } finally {
            setLoadingSubId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-1">Managed Subscriptions</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Subscriptions linked to this product. Keys are fetched on-demand for security.</p>
            </div>

            {subscriptions.length === 0 ? (
                <div className="bg-gray-50 dark:bg-slate-800/50 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl p-12 text-center">
                    <div className="text-3xl mb-4">🔑</div>
                    <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">No Subscriptions Found</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-2">You don't have active subscriptions to this product yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/10 ${sub.state === 'active' ? 'bg-green-50 text-green-600 dark:bg-green-500/10' : 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10'
                                        }`}>
                                        {sub.state === 'active' ? '✅' : '⏳'}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                            {(sub as any).displayName || sub.id}
                                        </h3>
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                                            Status: <span className={sub.state === 'active' ? 'text-green-600' : 'text-yellow-600'}>{sub.state}</span>
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleToggleKey(sub.id)}
                                    disabled={loadingSubId === sub.id}
                                    className={`
                                        px-6 py-3 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all
                                        ${visibleKeys[sub.id]
                                            ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                                            : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'}
                                        ${loadingSubId === sub.id ? 'opacity-50 cursor-wait' : ''}
                                    `}
                                >
                                    {loadingSubId === sub.id ? 'Fetching...' : visibleKeys[sub.id] ? 'Hide Keys' : 'Show Keys'}
                                </button>
                            </div>

                            {visibleKeys[sub.id] && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in zoom-in-95 duration-200">
                                    <KeyBox label="Primary Key" value={visibleKeys[sub.id].primary} />
                                    <KeyBox label="Secondary Key" value={visibleKeys[sub.id].secondary} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const KeyBox = ({ label, value }: { label: string; value: string }) => (
    <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
        <label className="block text-[8px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2">{label}</label>
        <div className="flex items-center justify-between">
            <code className="text-xs font-mono text-gray-900 dark:text-white truncate mr-2">{value}</code>
            <button
                onClick={() => navigator.clipboard.writeText(value)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                </svg>
            </button>
        </div>
    </div>
);
