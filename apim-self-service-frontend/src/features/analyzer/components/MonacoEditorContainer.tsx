import React from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

interface MonacoEditorContainerProps {
    spec: string;
    onSpecChange: (value: string) => void;
    onMount: OnMount;
}

export const MonacoEditorContainer: React.FC<MonacoEditorContainerProps> = ({
    spec,
    onSpecChange,
    onMount
}) => {
    return (
        <div className="flex-grow relative w-full bg-[#1e1e1e] flex flex-col overflow-hidden min-h-0">
            <Editor
                height="100%"
                defaultLanguage={spec.trim().startsWith('{') ? 'json' : 'yaml'}
                value={spec}
                theme="vs-dark"
                onChange={(value) => onSpecChange(value || '')}
                onMount={onMount}
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
        </div>
    );
};
