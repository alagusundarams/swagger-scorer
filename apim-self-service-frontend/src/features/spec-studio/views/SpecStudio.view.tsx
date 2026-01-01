import React, { useState, useEffect } from 'react';
import { useSpecStudio } from '../store/useSpecStudio';
import { ScoreCard } from '../components/ScoreCard';
import { ViolationsTable } from '../components/ViolationsTable';
import { MonacoEditorContainer } from '../components/MonacoEditorContainer';
import '../spec-studio.css';

/**
 * ------------------------------------------------------------------
 * 📍 Component: SpecStudio (The Unified Spec Engine)
 * ------------------------------------------------------------------
 * 🔄 LIFECYCLE:
 * - Mounted during Onboarding (Step 2) to sketch new APIs.
 * - Mounted in ContractEditorModal for "Day 2" maintenance.
 * - Mounted in standalone /analyzer for ad-hoc compliance checks.
 * 
 * 📥 DATA INFLOW:
 * - `initialContent`: Hydrated from either Onboarding state OR a Remote Git fetch (maintenance).
 * - `onContentChange`: External callback to sync changes back to the parent (e.g., Onboarding Wizard state).
 * 
 * 📤 DATA OUTFLOW (Internal State / Event Bus):
 * - Uses `useSpecStudio` (Zustand) for global-to-feature state.
 * - `runAnalysis()`: Triggers external API calls via `analysisClient.ts`.
 * - `onAnalysisComplete`: Custom event hook to notify parent wizards of quality gate status.
 * ------------------------------------------------------------------
 */
interface SpecStudioProps {
    initialContent?: string;
    onContentChange?: (content: string) => void;
    readOnly?: boolean;
    onAnalysisComplete?: (result: any) => void;
    toolbarActions?: React.ReactNode;
}

export const SpecStudio: React.FC<SpecStudioProps> = ({
    initialContent,
    onContentChange,
    readOnly = false,
    onAnalysisComplete,
    toolbarActions
}) => {
    const {
        spec,
        setSpec,
        runAnalysis,
        result,
        loading,
        error,
        selectedLine,
        selectLine,
        reset
    } = useSpecStudio();

    const [inputType, setInputType] = useState<'editor' | 'upload' | 'url'>(initialContent ? 'editor' : 'upload');
    const [urlInput, setUrlInput] = useState('');
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);

    useEffect(() => {
        if (initialContent) {
            setSpec(initialContent);
        }
    }, [initialContent, setSpec]);

    useEffect(() => {
        if (result && onAnalysisComplete) {
            onAnalysisComplete(result);
        }
    }, [result, onAnalysisComplete]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setSpec(content);
            setInputType('editor');
            runAnalysis();
        };
        reader.onerror = () => {
            alert('Failed to read file. Please try again.');
        };
        reader.readAsText(file);
    };

    const handleUrlImport = async () => {
        if (!urlInput) return;
        setIsFetchingUrl(true);
        try {
            const res = await fetch(urlInput);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const text = await res.text();
            setSpec(text);
            setInputType('editor');
            runAnalysis();
        } catch (err: any) {
            alert(`Failed to fetch from URL: ${err.message}. Please check CORS or validity.`);
        } finally {
            setIsFetchingUrl(false);
        }
    };

    const handleSpecChange = (newVal: string) => {
        setSpec(newVal);
        if (onContentChange) {
            onContentChange(newVal);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-500 text-white px-6 py-2 text-xs font-bold flex justify-between items-center animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                    <button onClick={reset} className="hover:bg-white/20 px-2 py-1 rounded transition-colors uppercase font-black tracking-widest text-[10px]">Dismiss</button>
                </div>
            )}

            {/* Header Content Toggles (Internal to Studio) */}
            {!readOnly && !spec && (
                <div className="p-4 border-b border-slate-800 flex justify-center gap-2">
                    {(['editor', 'upload', 'url'] as const).map(type => (
                        <button
                            key={type}
                            onClick={() => { setInputType(type); reset(); }}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${inputType === type
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 flex gap-px min-h-0 overflow-hidden">
                {/* LEFT: Editor */}
                <div className="flex-1 flex flex-col relative bg-[#1e1e1e]">
                    {inputType === 'upload' && !spec ? (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-2xl border border-slate-700">📂</div>
                            <h3 className="text-xl font-bold text-white mb-2">Upload API Specification</h3>
                            <p className="text-sm text-slate-400 mb-8 max-w-xs">Drag and drop your OpenAPI (YAML/JSON) file to begin analysis.</p>
                            <input
                                type="file"
                                accept=".json,.yaml,.yml"
                                onChange={handleFileUpload}
                                className="file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                            />
                        </div>
                    ) : inputType === 'url' && !spec ? (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-4xl mb-6 shadow-2xl border border-slate-700">🔗</div>
                            <h3 className="text-xl font-bold text-white mb-6">Import from URL</h3>
                            <div className="flex w-full max-w-md gap-3">
                                <input
                                    type="text"
                                    placeholder="https://..."
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                                <button
                                    onClick={handleUrlImport}
                                    disabled={isFetchingUrl}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
                                >
                                    {isFetchingUrl ? 'Fetching...' : 'Import'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Editor Toolbar */}
                            {!readOnly && (
                                <div className="h-12 bg-[#252526] border-b border-[#333] flex items-center justify-between px-6 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">openapi.yaml</span>
                                        {loading && <span className="text-[10px] font-bold text-blue-400 animate-pulse">Analyzing...</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => { setSpec(''); reset(); setInputType('upload'); }}
                                            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                                        >
                                            Reset
                                        </button>
                                        <button
                                            onClick={runAnalysis}
                                            disabled={loading}
                                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                                        >
                                            {loading ? 'Processing...' : 'Run Analysis'}
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex-1 relative">
                                <MonacoEditorContainer
                                    spec={spec}
                                    onSpecChange={handleSpecChange}
                                    revealLine={selectedLine}
                                    readOnly={readOnly}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Analyzer Panel */}
                <div className="w-[420px] bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Analyzer Intelligence</h3>
                            {result && (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${result.status === 'green' ? 'bg-emerald-500/10 text-emerald-500' :
                                    result.status === 'amber' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                    {result.status}
                                </span>
                            )}
                        </div>

                        {result ? (
                            <>
                                <ScoreCard result={result} />
                                <div className="mt-8">
                                    <ViolationsTable result={result} onSelectLine={selectLine} />
                                </div>
                            </>
                        ) : error ? (
                            <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-red-950/20 rounded-3xl border border-red-900/50 border-dashed">
                                <div className="text-3xl mb-4">⚠️</div>
                                <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">Analysis Error</p>
                                <p className="text-[11px] text-red-400/80 leading-relaxed">{error}</p>
                                <button onClick={runAnalysis} className="mt-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Retry Analysis</button>
                            </div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-slate-800/50 rounded-3xl border border-slate-800 border-dashed">
                                <div className="text-3xl mb-4 opacity-50">⚖️</div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Waiting for Content</p>
                                <p className="text-[11px] text-slate-600 leading-relaxed">Provide an API specification to initiate structural and security analysis.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions if any */}
                    {toolbarActions && (
                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md shrink-0">
                            {toolbarActions}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
