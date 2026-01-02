
import React from 'react';
import Editor from '@monaco-editor/react';

interface PolicyXmlEditorProps {
    xmlContent: string;
    onChange: (value: string | undefined) => void;
    error?: string | null;
    readOnly?: boolean;
}

export const PolicyXmlEditor: React.FC<PolicyXmlEditorProps> = ({
    xmlContent,
    onChange,
    error,
    readOnly
}) => {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
            {error && (
                <div className="bg-red-500/10 border-b border-red-500/20 p-3 flex items-center justify-between z-10">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="text-sm">⚠️</span> {error}
                    </p>
                </div>
            )}

            <Editor
                height="100%"
                defaultLanguage="xml"
                theme="vs-dark"
                value={xmlContent}
                onChange={onChange}
                options={{
                    readOnly,
                    minimap: { enabled: false },
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 20 },
                    wordWrap: 'on'
                }}
            />
        </div>
    );
};
