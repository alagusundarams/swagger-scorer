import React from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';

interface MonacoEditorContainerProps {
    spec: string;
    onSpecChange: (value: string) => void;
    onMount?: OnMount;
    revealLine?: number | null;
    readOnly?: boolean;
    language?: string;
}

export const MonacoEditorContainer: React.FC<MonacoEditorContainerProps> = ({
    spec,
    onSpecChange,
    onMount,
    revealLine,
    readOnly = false,
    language
}) => {
    const editorRef = React.useRef<any>(null);
    const decorationsRef = React.useRef<string[]>([]);

    const handleMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        if (onMount) onMount(editor, monaco);
    };

    React.useEffect(() => {
        if (editorRef.current) {
            const currentValue = editorRef.current.getValue();
            if (spec !== currentValue) {
                editorRef.current.setValue(spec);
            }
            setTimeout(() => {
                editorRef.current.layout();
            }, 50);
        }
    }, [spec]);

    React.useEffect(() => {
        if (editorRef.current && revealLine && (window as any).monaco) {
            editorRef.current.revealLineInCenter(revealLine);
            const range = new (window as any).monaco.Range(revealLine, 1, revealLine, 1);

            decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
                {
                    range: range,
                    options: {
                        isWholeLine: true,
                        className: 'bg-red-500/20 border-l-2 border-red-500',
                    }
                }
            ]);
        }
    }, [revealLine]);

    const defaultLanguage = language || (spec.trim().startsWith('{') ? 'json' : 'yaml');

    return (
        <div className="h-full relative w-full bg-[#1e1e1e] flex flex-col overflow-hidden min-h-0">
            <Editor
                height="100%"
                defaultLanguage={defaultLanguage}
                value={spec}
                theme="vs-dark"
                onChange={(value) => onSpecChange(value || '')}
                onMount={handleMount}
                options={{
                    readOnly,
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
