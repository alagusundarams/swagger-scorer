
import { useState } from 'react';
import { inventoryApi } from '../../api/inventoryClient';
import { Environment } from '../../../../shared/types/domain';

interface TargetIdentityStepProps {
    targetEnv: Environment;
    productId: string;
    onNext: (identity: { clientId: string, displayName: string }) => void;
    onBack: () => void;
}

export const TargetIdentityStep = ({ targetEnv, productId, onNext, onBack }: TargetIdentityStepProps) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ clientId: string; displayName: string; appIdUri?: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [linking, setLinking] = useState(false);

    const handleSearch = async () => {
        if (!query || query.length < 3) return;
        setLoading(true);
        try {
            const res = await inventoryApi.searchAzureIdentities(query);
            setResults(res);
        } catch (err) {
            console.error('Search failed', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async () => {
        const selected = results.find(r => r.clientId === selectedId);
        if (!selected) return;

        setLinking(true);
        try {
            await inventoryApi.linkIdentity({
                productId,
                environment: targetEnv,
                clientId: selected.clientId,
                displayName: selected.displayName
            });
            onNext(selected);
        } catch (err) {
            console.error('Link failed', err);
            alert('Failed to link identity: ' + (err as any).message); // Simple alert for now, wizard handles toasts ideally
        } finally {
            setLinking(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
            <div className="flex-1 max-w-4xl mx-auto w-full p-12">
                <div className="mb-8 text-center">
                    <h3 className="text-2xl font-black tracking-tighter mb-2">Select Target Identity</h3>
                    <p className="text-slate-500">
                        {targetEnv} requires a dedicated App Registration. Search Azure AD to link one.
                    </p>
                </div>

                {/* Search Area */}
                <div className="flex gap-4 mb-8">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search by App Name or Client ID..."
                        className="flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading || query.length < 3}
                        className="px-8 bg-slate-900 dark:bg-slate-700 text-white rounded-xl font-bold uppercase text-xs tracking-widest disabled:opacity-50 hover:bg-slate-800 transition-all"
                    >
                        {loading ? '...' : 'Search'}
                    </button>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto mb-8 pr-2">
                    {results.length === 0 && !loading && (
                        <div className="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                            <span className="text-4xl block mb-2 opacity-20">🔍</span>
                            <p className="text-sm text-slate-400 font-medium">No results found</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {results.map((app) => (
                            <div
                                key={app.clientId}
                                onClick={() => setSelectedId(app.clientId)}
                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedId === app.clientId
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                            >
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{app.displayName}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                            {app.clientId}
                                        </code>
                                        {app.appIdUri && (
                                            <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                                {app.appIdUri}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {selectedId === app.clientId && (
                                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                                        ✓
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-8 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onBack}
                        className="px-6 py-3 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-colors"
                    >
                        Back
                    </button>
                    <button
                        onClick={handleLink}
                        disabled={!selectedId || linking}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex items-center gap-3"
                    >
                        {linking ? 'Verifying & Linking...' : 'Confirm Identity →'}
                    </button>
                </div>
            </div>
        </div>
    );
};
