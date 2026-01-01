import { useState, useEffect } from 'react';

/**
 * ------------------------------------------------------------------
 * 📍 Component: OnboardingResolutionStep (Variable Resolution)
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Scans the finalized API/Product policies for `{{variable}}` placeholders.
 * - Provides a JIT (Just-In-Time) UI for resolving these into environment-specific 
 *   Named Values (Managed via GitLab/ADO pipelines).
 * 
 * 📥 DATA INFLOW:
 * - `productPolicyXml` & `apiPolicies`: The full set of XML content to scan.
 * - `existingNamedValues`: Registry of already known variables for pre-hydration.
 * 
 * 📤 DATA OUTFLOW:
 * - `onNext(resolvedValues)`: Emits the final key-value pairs to be injected 
 *   during the environment-specific deployment pipeline.
 * ------------------------------------------------------------------
 */
interface OnboardingResolutionStepProps {
    productPolicyXml: string;
    apiPolicies: Record<string, string>;
    existingNamedValues: { name: string; value: string }[]; // Passed from parent
    onBack: () => void;
    onNext: (newNamedValues: { name: string; value: string }[]) => void;
}

interface DetectedVariable {
    name: string;
    isExisting: boolean;
    currentValue?: string; // If existing
    newValue: string;      // Input for new
}

export const OnboardingResolutionStep = ({
    productPolicyXml,
    apiPolicies,
    existingNamedValues,
    onBack,
    onNext
}: OnboardingResolutionStepProps) => {

    const [variables, setVariables] = useState<DetectedVariable[]>([]);

    // 1. Scan Policies for {{...}}
    useEffect(() => {
        const uniqueVars = new Set<string>();

        const scan = (xml: string) => {
            const regex = /{{([^}]+)}}/g;
            let match;
            while ((match = regex.exec(xml)) !== null) {
                uniqueVars.add(match[1].trim());
            }
        };

        scan(productPolicyXml);
        Object.values(apiPolicies).forEach(scan);

        // 2. Map to State
        const defaults: DetectedVariable[] = Array.from(uniqueVars).map(v => {
            const existing = existingNamedValues.find(nv => nv.name === v);
            return {
                name: v,
                isExisting: !!existing,
                currentValue: existing?.value || '***', // simplified
                newValue: ''
            };
        });

        setVariables(defaults);
    }, [productPolicyXml, apiPolicies, existingNamedValues]);


    const handleValueChange = (name: string, val: string) => {
        setVariables((prev: DetectedVariable[]) => prev.map((v: DetectedVariable) => v.name === name ? { ...v, newValue: val } : v));
    };

    const isValid = variables.every(v => v.isExisting || v.newValue.length > 0);

    return (
        <div className="animate-fade-in text-slate-900 dark:text-white p-8 max-w-5xl mx-auto flex flex-col h-full">
            <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500 mb-2">Step 5: Configuration</p>
                <h2 className="text-4xl font-black tracking-tighter mb-2">Resolve Variables</h2>
                <p className="text-slate-500">
                    We found {variables.length} referenced variables in your policies.
                    Please define the missing values.
                </p>
            </div>

            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                {variables.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <span className="text-4xl mb-4">✨</span>
                        <p>No variables detected. You are good to go!</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="p-6">Variable Name</th>
                                    <th className="p-6">Status</th>
                                    <th className="p-6">Value / Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {variables.map((v: DetectedVariable) => (
                                    <tr key={v.name} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="p-6 font-mono text-purple-400 font-bold">
                                            {`{ {${v.name} } } `}
                                        </td>
                                        <td className="p-6">
                                            {v.isExisting ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Existing
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 animate-pulse">
                                                    New Required
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-6">
                                            {v.isExisting ? (
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <span className="text-xs">Linked:</span>
                                                    <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-xs">{v.currentValue}</code>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter value (e.g. https://api...)"
                                                        value={v.newValue}
                                                        onChange={e => handleValueChange(v.name, e.target.value)}
                                                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                                        autoFocus={variables.indexOf(v) === 0}
                                                    />
                                                    <span className="text-[10px] text-slate-400">Will be created as a named value</span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center mt-8">
                <button
                    onClick={onBack}
                    className="px-6 py-2 text-slate-500 font-bold hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={() => onNext(variables.filter((v: DetectedVariable) => !v.isExisting).map((v: DetectedVariable) => ({ name: v.name, value: v.newValue })))}
                    disabled={!isValid}
                    className="px-8 py-3 bg-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    Review Final Plan →
                </button>
            </div>
        </div>
    );
};
