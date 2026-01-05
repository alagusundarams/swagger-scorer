import type { API, AppRegistration } from '../../../../shared/types/domain';

interface SecurityTabProps {
    api: API;
}

export function SecurityTab({ api }: SecurityTabProps) {
    // In a real scenarios, these would be fetched from the API's appRegistrations array
    // Since we just updated the sync, we assume they are coming from the backend now.
    // For now, we use a fallback to empty if the backend hasn't synced yet.
    const identities = (api as any).appRegistrations || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div>
                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-1">Authorized Identities</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Verified App Registrations detected in this API's security policies.</p>
            </div>

            {identities.length === 0 ? (
                <div className="bg-gray-50 dark:bg-slate-800/50 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl p-12 text-center">
                    <div className="text-3xl mb-4">🛡️</div>
                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">No Identities Linked</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-600 mt-2">Check the API policies for validate-jwt or validation-key settings.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {identities.map((id: AppRegistration) => (
                        <div
                            key={id.id}
                            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 6.247a13.487 13.487 0 001.688 4.523 13.487 13.487 0 005.258 5.746l.056.028a1.107 1.107 0 001.2 0l.056-.028a13.487 13.487 0 005.258-5.746 13.487 13.487 0 001.688-4.523l-.382-.703z" />
                                    </svg>
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-gray-100 dark:bg-slate-700/50 text-gray-500 rounded-full">
                                    {id.environment}
                                </span>
                            </div>

                            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors">
                                {id.displayName}
                            </h3>
                            <div className="flex items-center space-x-2">
                                <code className="text-[9px] text-gray-400 dark:text-slate-500 font-mono">
                                    {id.clientId}
                                </code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(id.clientId)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors text-gray-400"
                                    title="Copy Client ID"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
