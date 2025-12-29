import { useState, useEffect } from 'react';
import { useAnalysis } from '../../analyzer/store/useAnalysis';
import { MonacoEditorContainer } from '../../analyzer/components/MonacoEditorContainer';
import { ScoreCard } from '../../analyzer/components/ScoreCard';

interface OnboardingSpecStepProps {
    onBack: () => void;
    onNext: (specContent: string) => void;
}

export const OnboardingSpecStep = ({ onBack, onNext }: OnboardingSpecStepProps) => {
    // === STATE ===
    const [inputType, setInputType] = useState<'upload' | 'paste' | 'url'>('paste');
    const [specInput, setSpecInput] = useState('');
    const [parsedOperations, setParsedOperations] = useState<{ method: string; path: string; summary: string }[]>([]);

    // === STORE INTEGRATION ===
    const {
        spec,
        setSpec,
        runAnalysis,
        result,
        loading,
        reset
    } = useAnalysis();

    // Reset analyzer on mount
    useEffect(() => {
        reset();
    }, [reset]);

    // Parse operations when result changes (meaning spec is valid-ish)
    // Use backend-provided operations for preview
    useEffect(() => {
        if (result && result.operations) {
            setParsedOperations(result.operations);
        } else if (result) {
            setParsedOperations([]); // Clear if valid result but no operations found
        }
    }, [result]);


    // === HANDLERS ===
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setSpec(content); // Update store
            runAnalysis(); // Auto-run
        };
        reader.readAsText(file);
    };

    const handleUrlImport = async () => {
        if (!specInput) return;
        try {
            // In a real app, this would likely go through a backend proxy to avoid CORS
            // For now, assuming the user might paste a raw GithHub url
            const res = await fetch(specInput);
            const text = await res.text();
            setSpec(text);
            runAnalysis();
        } catch (err) {
            alert('Failed to fetch from URL. Please check CORS or validity.');
        }
    };

    const handleEditorMount = (editor: any, monaco: any) => {
        // Optional: configure editor further
    };

    const isValid = result && result.score > 0; // Threshold for proceed (any score > 0 means parsed)

    return (
        <div className="animate-fade-in text-slate-900 dark:text-white p-6 flex-1 flex flex-col h-full">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">Step 2: API Specification</p>
                    <h2 className="text-3xl font-black tracking-tighter">Define Contract</h2>
                </div>

                {/* Input Type Toggles */}
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                    {(['paste', 'upload', 'url'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => setInputType(type)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${inputType === type
                                    ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex gap-6 min-h-0"> {/* Main Content Area */}

                {/* LEFT COLUMN: Editor & Input */}
                <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                    {/* Input Area (Conditional) */}
                    {inputType === 'upload' && !spec && (
                        <div className="h-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-700 m-4 rounded-xl hover:border-slate-500 transition-colors">
                            <span className="text-4xl mb-4">📂</span>
                            <p className="font-bold text-slate-400 mb-4">Drag & drop your OpenAPI file here</p>
                            <input
                                type="file"
                                accept=".json,.yaml,.yml"
                                onChange={handleFileUpload}
                                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                            />
                        </div>
                    )}

                    {inputType === 'url' && !spec && (
                        <div className="p-8 flex flex-col items-center justify-center h-full">
                            <h3 className="text-lg font-bold text-white mb-4">Import from URL</h3>
                            <div className="flex w-full max-w-md gap-2">
                                <input
                                    type="text"
                                    placeholder="https://raw.githubusercontent.com/..."
                                    value={specInput}
                                    onChange={e => setSpecInput(e.target.value)}
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button
                                    onClick={handleUrlImport}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
                                >
                                    Import
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Editor (Always show if spec exists, or if mode is 'paste') */}
                    {(spec || inputType === 'paste') && (
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="bg-slate-800 px-4 py-2 flex justify-between items-center border-b border-slate-700">
                                <span className="text-xs font-mono text-slate-400">openapi.yaml</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={runAnalysis}
                                        disabled={loading}
                                        className={'text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-2 ' + (loading ? 'opacity-50' : '')}
                                    >
                                        {loading ? 'Analyzing...' : '▶ Run Analysis'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 relative">
                                <MonacoEditorContainer
                                    spec={spec}
                                    onSpecChange={setSpec}
                                    onMount={handleEditorMount}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Validation & Preview */}
                <div className="w-[400px] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

                    {/* Score Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Quality Gate</h3>
                        {result ? (
                            <div className="transform scale-90 -mt-4 -mb-4">
                                <ScoreCard />
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400 italic text-sm">
                                Run analysis to see quality score
                            </div>
                        )}

                        {/* Violations Summary */}
                        {result && result.violations.length > 0 && (
                            <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                                <h4 className="text-[10px] font-bold uppercase text-red-500 mb-2">{result.violations.length} Violations Found</h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {result.violations.slice(0, 5).map((v, i) => (
                                        <div key={i} className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border-l-2 border-red-500">
                                            <span className="font-mono text-[10px] opacity-70">Ln {v.line}:</span> {v.message}
                                        </div>
                                    ))}
                                    {result.violations.length > 5 && (
                                        <div className="text-center text-[10px] text-slate-400 italic">
                                            + {result.violations.length - 5} more (check editor)
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Operations Preview */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg flex-1">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Operations Preview</h3>
                        {parsedOperations.length > 0 ? (
                            <div className="space-y-3">
                                {parsedOperations.map((op, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase w-16 text-center shrink-0 ${op.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                                                op.method === 'POST' ? 'bg-green-100 text-green-700' :
                                                    op.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                        'bg-orange-100 text-orange-700'
                                            }`}>
                                            {op.method}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-mono font-bold truncate text-slate-700 dark:text-slate-300">{op.path}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{op.summary}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-slate-400 text-sm">
                                {spec ? 'No operations found in spec.' : 'Waiting for spec...'}
                            </div>
                        )}
                    </div>

                </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-slate-700">
                <button
                    onClick={onBack}
                    className="px-6 py-2 text-gray-500 font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    Back to Identity
                </button>
                <div className="flex items-center gap-4">
                    {result && (
                        <div className="text-right">
                            <span className="block text-[10px] font-black uppercase text-slate-400">Validation Status</span>
                            <span className={`text-sm font-bold ${isValid ? 'text-green-500' : 'text-orange-500'}`}>
                                {isValid ? 'Ready to Submit' : 'Improvements Recommended'}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => spec && onNext(spec)}
                        disabled={!spec}
                        className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Review & Submit →
                    </button>
                </div>
            </div>
        </div>
    );
};
