import React from 'react';

interface AnalyzerToolbarProps {
    isMaximized: boolean;
    onToggleMaximize: () => void;
    onClear: () => void;
    onSave: () => void;
    onRun: () => void;
    saving: boolean;
    loading: boolean;
    spec: string;
    isAuthenticated: boolean;
}

export const AnalyzerToolbar: React.FC<AnalyzerToolbarProps> = ({
    isMaximized,
    onToggleMaximize,
    onClear,
    onSave,
    onRun,
    saving,
    loading,
    spec,
    isAuthenticated
}) => {
    return (
        <div className="flex flex-row shrink-0 bg-[#252526] border-b border-[#1e1e1e] items-center h-[38px]">
            {/* Tabs */}
            <div className="flex items-center h-full">
                {/* YAML Tab (Static Title) */}
                <div
                    className="px-4 h-full text-[13px] flex items-center gap-2 select-none border-t-2 bg-[#1e1e1e] text-white border-t-blue-500"
                >
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>openapi.yaml</span>
                </div>
            </div>

            {/* Spacer */}
            <div className="flex-grow"></div>

            {/* Toolbar Buttons */}
            <div className="flex items-center px-3 gap-2 h-full">
                <button
                    onClick={onClear}
                    className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all duration-200 hover:scale-105 active:scale-95"
                    title="Clear Workspace"
                >
                    Clear
                </button>

                <button
                    onClick={onToggleMaximize}
                    className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all duration-200 hover:scale-105 active:scale-95"
                    title={isMaximized ? "Restore Editor" : "Maximize Editor"}
                >
                    {isMaximized ? "Restore" : "Maximize"}
                </button>

                <button
                    onClick={onSave}
                    disabled={saving || !spec.trim()}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 ${saving || !spec.trim()
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-gray-400 hover:text-white hover:bg-white/10 hover:scale-105 active:scale-95'
                        }`}
                    title={isAuthenticated ? "Save Draft" : "Sign in to Save"}
                >
                    {saving ? (
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                    )}
                    <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <div className="w-px h-4 bg-gray-700 mx-1"></div>

                <button
                    onClick={onRun}
                    disabled={loading || !spec.trim()}
                    className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-all duration-200 ${loading || !spec.trim()
                        ? 'bg-[#3b3b3b] text-gray-600 cursor-not-allowed'
                        : 'bg-[#0e639c] text-white hover:bg-[#1177bb] hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 active:scale-95'
                        }`}
                    title="Run Analysis"
                >
                    {loading ? "Running..." : "Run"}
                </button>
            </div>
        </div>
    );
};
