import Editor from '@monaco-editor/react';

/**
 * ------------------------------------------------------------------
 * 📍 Component: PolicyXmlEditor
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Expert-mode editor for raw APIM XML policy definitions.
 * - Provides bit-level control over the policy configuration.
 * - Syncs back to the Visual editor via the `usePolicyStudio` hook.
 * 
 * 📥 DATA INFLOW:
 * - `xml`: The raw XML string representing the active scope.
 * ------------------------------------------------------------------
 */
interface PolicyXmlEditorProps {
    xmlContent: string;
    onChange: (newXml: string | undefined) => void;
    error: string | null;
    readOnly: boolean;
}

export const PolicyXmlEditor = ({ xmlContent, onChange, error, readOnly }: PolicyXmlEditorProps) => {
    return (
        <div className="flex-1 relative flex flex-col h-full bg-[#1e1e1e]">
            <Editor
                height="100%"
                language="xml"
                theme="vs-dark"
                value={xmlContent}
                onChange={onChange}
                options={{
                    minimap: { enabled: false },
                    fontSize: 12,
                    readOnly: readOnly,
                    domReadOnly: readOnly,
                    scrollBeyondLastLine: false,
                    automaticLayout: true
                }}
                className="h-full w-full"
            />
            {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg text-xs font-bold border border-red-400 shadow-xl z-50 animate-bounce">
                    <span className="mr-2">⚠️</span>
                    {error}
                </div>
            )}
        </div>
    );
};
