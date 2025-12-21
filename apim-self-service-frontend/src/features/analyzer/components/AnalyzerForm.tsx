/**
 * @fileoverview AnalyzerForm Component
 * 
 * This is the main editor component for the APIM Self Service portal.
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
import { useLocation } from 'react-router-dom';
import { type OnMount, type Monaco } from '@monaco-editor/react';
import { useAuth } from '../../auth/hooks/useAuth';
import { saveDraft, getLatestDraft } from '../api/client';
import { useAnalysis } from '../store/useAnalysis';
import { AnalyzerToolbar } from './AnalyzerToolbar';
import { MonacoEditorContainer } from './MonacoEditorContainer';
import { AnalyzerStatusBar } from './AnalyzerStatusBar';

export const AnalyzerForm: React.FC = () => {
    // === STATE & REFS ===
    // Get global state from Zustand store
    const { spec, setSpec, result, error, loading, runAnalysis, reset, isMaximized, toggleMaximize, selectedLine } = useAnalysis();

    // Refs to access Monaco editor instance directly
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<Monaco | null>(null);

    // === IMPORTS & AUTH ===
    const { isAuthenticated, login, getToken } = useAuth();
    const [saving, setSaving] = useState(false);

    // Track initial content for dirty checking
    const initialSpecRef = useRef(spec);

    // Auto-load draft on mount if authenticated
    const location = useLocation();
    useEffect(() => {
        // Priority 1: Check for deep-linked spec from navigation state
        const state = location.state as { startWithSpec?: string } | null;
        if (state?.startWithSpec) {
            setSpec(state.startWithSpec);
            initialSpecRef.current = state.startWithSpec;
            setTimeout(() => runAnalysis(), 100);
            return;
        }

        // Priority 2: Check for query params
        const params = new URLSearchParams(location.search);
        const specType = params.get('spec');
        if (specType === 'deprecation-check') {
            const demoSpec = `openapi: 3.0.0
info:
  title: Legacy XML Gateway
  version: 0.9.0
paths:
  /soap/v1/transaction:
    post:
      deprecated: true
      summary: Handle SOAP transaction
      description: This endpoint is deprecated. Use REST API at /v1/payments instead.
      responses:
        '200':
          description: OK
`;
            setSpec(demoSpec);
            initialSpecRef.current = demoSpec;
            return;
        }

        const loadDraft = async () => {
            if (isAuthenticated && !spec) {
                try {
                    const token = await getToken();
                    if (!token) return;

                    const draft = await getLatestDraft(token);
                    if (draft.data.spec) {
                        if (confirm(`Found a saved draft "${draft.data.apiTitle}" from ${new Date(draft.data.updatedAt).toLocaleDateString()}. Load it?`)) {
                            setSpec(draft.data.spec);
                            initialSpecRef.current = draft.data.spec;
                        }
                    }
                } catch (err) {
                    console.log("No draft found or silent auth failed");
                }
            }
        };
        loadDraft();
    }, [isAuthenticated, location, getToken, runAnalysis, setSpec, spec]);

    // Warn on unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (spec !== initialSpecRef.current) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [spec]);

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
            initialSpecRef.current = spec;
        } catch (err) {
            console.error("Failed to save", err);
            alert("Failed to save draft. Please try signing in again.");
        } finally {
            setSaving(false);
        }
    };

    const handleClear = () => {
        if (confirm('Are you sure you want to clear the editor?')) {
            reset();
            initialSpecRef.current = '';
            if (editorRef.current && monacoRef.current) {
                monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'owner', []);
            }
        }
    };

    /**
     * Effect: Update editor markers when analysis results change.
     */
    useEffect(() => {
        if (!editorRef.current || !monacoRef.current || !result) return;
        const model = editorRef.current.getModel();
        if (!model) return;

        const markers = result.violations.map(v => ({
            startLineNumber: v.line,
            startColumn: 1,
            endLineNumber: v.line,
            endColumn: 1000,
            message: `${v.message} (${v.rule})`,
            severity: v.severity === 'error' ? 8 : v.severity === 'warning' ? 4 : 2
        }));

        monacoRef.current.editor.setModelMarkers(model, 'owner', markers);
    }, [result]);

    /**
     * Effect: Navigate to selected line when user clicks a violation.
     */
    useEffect(() => {
        if (!editorRef.current || selectedLine === null) return;
        editorRef.current.revealLineInCenter(selectedLine);
        editorRef.current.setPosition({ lineNumber: selectedLine, column: 1 });
        editorRef.current.focus();
    }, [selectedLine]);

    const handleEditorMountWithTheme: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
    };

    // === RENDER ===
    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] relative">
            {/* Error Banner */}
            {error && (
                <div className="m-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-2 animate-fade-in">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <AnalyzerToolbar
                isMaximized={isMaximized}
                onToggleMaximize={toggleMaximize}
                onClear={handleClear}
                onSave={handleSave}
                onRun={runAnalysis}
                saving={saving}
                loading={loading}
                spec={spec}
                isAuthenticated={isAuthenticated}
            />

            <MonacoEditorContainer
                spec={spec}
                onSpecChange={setSpec}
                onMount={handleEditorMountWithTheme}
            />

            <AnalyzerStatusBar lineCount={spec.split('\n').length} />
        </div>
    );
};

