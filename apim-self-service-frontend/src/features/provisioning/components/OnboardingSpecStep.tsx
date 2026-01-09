import { useState, useEffect } from 'react';
import { SpecStudio, useSpecStudio } from '../../spec-studio';
import { useApisQuery } from '../../inventory/api/inventoryQueries'; // Import useApisQuery

/**
 * ------------------------------------------------------------------
 * 📍 Component: OnboardingSpecStep
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Second step in the onboarding wizard focusing on the API Contract.
 * - Integrates the SpecStudio engine for ad-hoc editing/analysis.
 * - Handles the ingestion of OpenAPI files (Upload, URL, Paste).
 * 
 * 📥 DATA INFLOW:
 * - `formData.spec`: Hydrated from previous draft if available.
 * 
 * 📤 ACTIONS:
 * - `onNext`: Persists the validated spec to the shared wizard store.
 * ------------------------------------------------------------------
 */
interface OnboardingSpecStepProps {
    onBack: () => void;
    onNext: (specContent: string, apiName: string, apiSuffix: string) => void;
    initialSpec?: string;
    initialApiName?: string;
    initialApiSuffix?: string;
}

export const OnboardingSpecStep = ({ onBack, onNext, initialSpec = '', initialApiName = '', initialApiSuffix = '' }: OnboardingSpecStepProps) => {
    // === STATE ===
    const [apiName, setApiName] = useState(initialApiName);
    const [apiSuffix, setApiSuffix] = useState(initialApiSuffix);
    const [parsedOperations, setParsedOperations] = useState<{ method: string; path: string; summary: string }[]>([]);

    // === QUERY INTEGRATION ===
    const { data: apis = [] } = useApisQuery();
    const {
        spec,
        setSpec,
        result,
    } = useSpecStudio();

    useEffect(() => {
        if (initialSpec && !spec) {
            setSpec(initialSpec);
        }
    }, [initialSpec, spec, setSpec]);

    useEffect(() => {
        if (result && result.operations) {
            setParsedOperations(result.operations);
        }
    }, [result]);

    const isValid = result && result.score > 0;

    // === VALIDATION ===
    const fullPath = `/v1/${apiSuffix}`.replace(/\/+/g, '/');
    const isDuplicatePath = apis.some((api: any) => api.path === fullPath); // Explicit typing
    const apiNameError = !apiName ? 'API Name is required.' : (!/^[a-zA-Z0-9-_]+$/.test(apiName) ? 'Alphanumeric, dashes, underscores only.' : null);
    const apiSuffixError = !apiSuffix ? 'URL Suffix is required.' : (!/^[a-zA-Z0-9-_\/]+$/.test(apiSuffix) ? 'Invalid path format.' : (isDuplicatePath ? `Duplicate Path: ${fullPath} is already in use.` : null));
    const isStepValid = !apiNameError && !apiSuffixError && spec.trim().length > 0;

    return (
        <div className="animate-fade-in text-slate-900 dark:text-white p-6 flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">Step 2: API Specification</p>
                        <h2 className="text-3xl font-black tracking-tighter">Define Contract</h2>
                    </div>
                </div>

                {/* API Identity Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">API Name</label>
                        <input
                            type="text"
                            value={apiName}
                            onChange={e => setApiName(e.target.value)}
                            placeholder="e.g. Orders-API"
                            className={`w-full bg-slate-50 dark:bg-slate-800/50 border p-3 rounded-xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-blue-500/20 transition-all ${apiNameError ? 'border-red-500 text-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                        />
                        {apiNameError && (
                            <p className="text-[10px] text-red-500 font-bold mt-1">{apiNameError}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">URL Suffix</label>
                        <div className="flex items-center">
                            <span className="bg-slate-100 dark:bg-slate-800 px-3 py-3 rounded-l-xl border-y border-l border-slate-200 dark:border-slate-700 text-slate-400 text-xs font-bold">/v1/</span>
                            <input
                                type="text"
                                value={apiSuffix}
                                onChange={e => setApiSuffix(e.target.value)}
                                placeholder="orders"
                                className={`flex-1 bg-slate-50 dark:bg-slate-800/50 border p-3 rounded-r-xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-blue-500/20 transition-all ${apiSuffixError ? 'border-red-500 text-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                            />
                        </div>
                        {apiSuffixError && (
                            <p className="text-[10px] text-red-500 font-bold mt-1">{apiSuffixError}</p>
                        )}
                    </div>
                </div>

                {parsedOperations.length > 0 && (
                    <div className="mb-4 animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Detected Operations ({parsedOperations.length})</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 p-2 overflow-hidden shadow-sm">
                            <div className="max-h-40 overflow-y-auto px-4 py-2 custom-scrollbar">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
                                    {parsedOperations.map((op, i) => (
                                        <div key={i} className="flex items-center gap-3 group">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${op.method === 'GET' ? 'bg-emerald-500/10 text-emerald-500' :
                                                op.method === 'POST' ? 'bg-blue-500/10 text-blue-500' :
                                                    op.method === 'PUT' ? 'bg-amber-500/10 text-amber-500' :
                                                        op.method === 'DELETE' ? 'bg-red-500/10 text-red-500' :
                                                            'bg-slate-500/10 text-slate-500'
                                                }`}>
                                                {op.method}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                                {op.path}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* The Integrated Spec Studio */}
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col">
                    <SpecStudio
                        initialContent={spec}
                        onContentChange={setSpec}
                    />
                </div>

                <div className="flex justify-between items-center mt-8 px-2">
                    <button
                        onClick={onBack}
                        className="px-6 py-2 text-gray-500 font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        Back to Identity
                    </button>
                    <div className="flex items-center gap-4">
                        {result && (
                            <div className="text-right">
                                <span className="block text-[10px] font-black uppercase text-slate-400">Analysis Result</span>
                                <span className={`text-sm font-black tracking-tight ${isValid ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {isValid ? 'VALIDATED' : 'IMPROVEMENTS RECOMMENDED'}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => spec && onNext(spec, apiName, apiSuffix)}
                            disabled={!isStepValid}
                            className="px-8 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue to Policies →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
