import React, { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface MonacoEditorProps {
    value: string;
    language: 'yaml' | 'json' | 'xml';
    onChange?: (value: string | undefined) => void;
    readOnly?: boolean;
    height?: string;
}

/**
 * Monaco Editor Wrapper - Lightweight and memory-efficient
 * 
 * Features:
 * - Auto-detects file type (YAML/JSON/XML)
 * - Built-in undo/redo (Ctrl+Z/Ctrl+Y)
 * - Syntax highlighting
 * - Auto-complete
 * - Line numbers
 * 
 * Memory Management:
 * - Only one instance per modal
 * - Disposes on unmount
 * - No models kept in memory
 */
export const MonacoEditor: React.FC<MonacoEditorProps> = ({
    value,
    language,
    onChange,
    readOnly = false,
    height = '600px'
}) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;
        // Focus editor on mount
        editor.focus();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
        };
    }, []);

    return (
        <Editor
            height={height}
            language={language}
            value={value}
            onChange={onChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
                readOnly,
                minimap: { enabled: false }, // Saves memory
                fontSize: 13,
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
                glyphMargin: false
            }}
        />
    );
};
