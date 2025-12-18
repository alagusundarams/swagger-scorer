/**
 * @fileoverview AnalyzerForm Component
 * 
 * This is the main editor component for the Swagger Scorer application.
 * It provides a VS Code-like interface for editing OpenAPI specifications.
 * 
 * Features:
 * - Monaco Editor with YAML syntax highlighting
 * - Tab-based interface (openapi.yaml / scorer.config.json)
 * - Real-time violation markers in the editor
 * - Click-to-navigate from violations to source lines
 * - Toolbar with Clear, Maximize, and Run actions
 * 
 * @component
 */

import React, { useState, useEffect, useRef } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import { useAuth } from '../../auth/hooks/useAuth';
import { saveDraft, getLatestDraft } from '../api/client';
import { useAnalysis } from '../store/useAnalysis';

export const AnalyzerForm: React.FC = () => {
    // === STATE & REFS ===
    // Get global state from Zustand store
    const { spec, setSpec, result, error, loading, runAnalysis, reset, isMaximized, toggleMaximize } = useAnalysis();

    // Refs to access Monaco editor instance directly
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);

    // Local state for active tab
    const [activeTab, setActiveTab] = useState<'yaml' | 'config'>('yaml');

    // === HANDLERS ===

    // === IMPORTS & AUTH ===
    const { isAuthenticated, login, getToken } = useAuth();
    const [saving, setSaving] = useState(false);

    // === EFFECTS ===

    // Auto-load draft on mount if authenticated
    useEffect(() => {
        const loadDraft = async () => {
            if (isAuthenticated && !spec) {
                try {
                    const token = await getToken();
                    if (!token) return;

                    const draft = await getLatestDraft(token);
                    if (draft.data.spec) {
                        if (confirm(`Found a saved draft "${draft.data.apiTitle}" from ${new Date(draft.data.updatedAt).toLocaleDateString()}. Load it?`)) {
                            setSpec(draft.data.spec);
                        }
                    }
                } catch (err) {
                    console.log("No draft found or silent auth failed");
                }
            }
        };
        loadDraft();
    }, [isAuthenticated]);

    // === HANDLERS ===

    const handleSave = async () => {
        if (!isAuthenticated) {
            login();
            return;
        }

        setSaving(true);
        try {
            const token = await getToken();
            if (!token) throw new Error("No access token");

            await saveDraft(spec, token, "My API Spec");
            // Could show a toast here
        } catch (err) {
            console.error("Failed to save", err);
            alert("Failed to save draft. Please try signing in again.");
        } finally {
            setSaving(false);
        }
    };

    /**
     * Clear the editor and reset analysis results.
     * Prompts user for confirmation before clearing.
     */
    const handleClear = () => {
        if (confirm('Are you sure you want to clear the editor?')) {
            reset();
            // Also clear any error markers from the editor
            if (editorRef.current && monacoRef.current) {
                monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'owner', []);
            }
        }
    };

    // === EFFECTS ===

    /**
     * Effect: Update editor markers when analysis results change.
     * This adds squiggly underlines to lines with violations.
     */
    useEffect(() => {
        if (!editorRef.current || !monacoRef.current || !result) return;
        const model = editorRef.current.getModel();
        if (!model) return;

        // Convert violations to Monaco marker format
        const markers = result.violations.map(v => ({
            startLineNumber: v.line,
            startColumn: 1,
            endLineNumber: v.line,
            endColumn: 1000,  // Highlight full line
            message: `${v.message} (${v.rule})`,
            // Map severity: error=8, warning=4, info=2
            severity: v.severity === 'error' ? 8 : v.severity === 'warning' ? 4 : 2
        }));

        monacoRef.current.editor.setModelMarkers(model, 'owner', markers);
    }, [result]);

    /**
     * Effect: Navigate to selected line when user clicks a violation.
     * Centers the line in view and sets cursor position.
     */
    const { selectedLine } = useAnalysis();
    useEffect(() => {
        if (!editorRef.current || selectedLine === null) return;
        editorRef.current.revealLineInCenter(selectedLine);
        editorRef.current.setPosition({ lineNumber: selectedLine, column: 1 });
        editorRef.current.focus();
    }, [selectedLine]);

    /**
     * Callback when Monaco editor mounts.
     * Stores references for later use.
     */
    const handleEditorMountWithTheme: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
    };

    // === RENDER ===
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] relative">
            {/* Error Banner - Shows API errors */}
            {error && (
                <div className="m-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2 animate-fade-in">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            {/* Editor Tabs & Toolbar */}
            <div className="flex flex-row shrink-0 bg-[#252526] border-b border-[#1e1e1e] items-center h-[38px]">
                {/* Tabs */}
                <div className="flex items-center h-full">
                    {/* YAML Tab */}
                    <div
                        onClick={() => setActiveTab('yaml')}
                        className={`px-4 h-full text-[13px] flex items-center gap-2 cursor-pointer select-none border-t-2 ${activeTab === 'yaml'
                            ? 'bg-[#1e1e1e] text-white border-t-blue-500'
                            : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e] border-t-transparent'
                            }`}
                    >
                        <svg className={`w-4 h-4 ${activeTab === 'yaml' ? 'text-blue-400' : 'opacity-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>openapi.yaml</span>
                    </div>

                    {/* Config Tab */}
                    <div
                        onClick={() => setActiveTab('config')}
                        className={`px-4 h-full text-[13px] flex items-center gap-2 cursor-pointer select-none border-t-2 ${activeTab === 'config'
                            ? 'bg-[#1e1e1e] text-white border-t-blue-500'
                            : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2a2d2e] border-t-transparent'
                            }`}
                    >
                        <svg className={`w-4 h-4 ${activeTab === 'config' ? 'text-yellow-400' : 'opacity-50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>scorer.config.json</span>
                    </div>
                </div>

                {/* Spacer */}
                <div className="flex-grow"></div>

                {/* Toolbar Buttons */}
                <div className="flex items-center px-3 gap-2 h-full">
                    <button
                        onClick={handleClear}
                        className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all duration-200 hover:scale-105 active:scale-95"
                        title="Clear Workspace"
                    >
                        Clear
                    </button>

                    <button
                        onClick={toggleMaximize}
                        className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all duration-200 hover:scale-105 active:scale-95"
                        title={isMaximized ? "Restore Editor" : "Maximize Editor"}
                    >
                        {isMaximized ? "Restore" : "Maximize"}
                    </button>

                    <button
                        onClick={handleSave}
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
                        onClick={runAnalysis}
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

            {/* Editor Area */}
            <div className="flex-grow relative w-full bg-[#1e1e1e] flex flex-col overflow-hidden">
                {activeTab === 'yaml' ? (
                    <>
                        {/* Monaco Editor */}
                        <Editor
                            height="100%"
                            defaultLanguage={spec.trim().startsWith('{') ? 'json' : 'yaml'}
                            value={spec}
                            theme="vs-dark"
                            onChange={(value) => setSpec(value || '')}
                            onMount={handleEditorMountWithTheme}
                            options={{
                                minimap: { enabled: true, scale: 0.75 },
                                fontSize: 13,
                                lineHeight: 24,
                                padding: { top: 16, bottom: 16 },
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                fontLigatures: true,
                                smoothScrolling: true,
                                cursorBlinking: 'smooth',
                                cursorSmoothCaretAnimation: 'on',
                                scrollBeyondLastLine: true,
                                automaticLayout: true,
                                renderLineHighlight: 'all',
                                overviewRulerBorder: false,
                                hideCursorInOverviewRuler: true,
                                roundedSelection: true,
                            }}
                        />

                        {/* Status Bar */}
                        <div className="bg-[#1e1e1e] border-t border-[#333] text-gray-500 px-3 py-1 flex justify-between items-center text-[11px] shrink-0">
                            <div className="flex gap-4">
                                <span>YAML</span>
                                <span>UTF-8</span>
                            </div>
                            <div>
                                <span>Ln {spec.split('\n').length}, Col 1</span>
                            </div>
                        </div>
                    </>
                ) : (
                    // Config Tab Placeholder
                    <div className="flex flex-col items-center justify-center h-full w-full text-gray-400 p-8 text-center">
                        <svg className="w-12 h-12 opacity-30 text-yellow-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-300 mb-2">Editor Configuration</h3>
                        <p className="text-sm text-gray-500 max-w-sm">
                            This panel is reserved for configuring scoring weights and global rulesets.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
