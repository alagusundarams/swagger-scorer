import { useState, useEffect } from 'react';
import { type PolicyStep } from '../../types/policyTypes';

interface Props {
    step: PolicyStep;
    onChange: (updatedProperties: Record<string, any>) => void;
}

export const GenericPolicyProperties = ({ step, onChange }: Props) => {
    // Local state for immediate feedback, syncs to parent on blur/change
    const [properties, setProperties] = useState(step.properties || {});
    const [customXml, setCustomXml] = useState(step.customXmlContent || step.xmlSnippet || '');

    useEffect(() => {
        setProperties(step.properties || {});
        setCustomXml(step.customXmlContent || step.xmlSnippet || '');
    }, [step.id]);

    const handlePropChange = (key: string, value: string) => {
        const newProps = { ...properties, [key]: value };
        setProperties(newProps);
        onChange(newProps);
    };

    const handleXmlChange = (val: string) => {
        setCustomXml(val);
        // Special key for custom-xml or treating snippet as property
        onChange({ ...properties, customXmlContent: val });
    };

    return (
        <div className="space-y-6">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                    ⚠ Using Generic Editor. Changes here update the underlying XML attributes directly.
                </p>
            </div>

            {/* Standard Properties Loop (Naive implementation: show known keys) */}
            {Object.entries(properties).map(([key, value]) => (
                <div key={key}>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                        {key}
                    </label>
                    <input
                        type="text"
                        value={value as string}
                        onChange={(e) => handlePropChange(key, e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            ))}

            {/* Always show raw XML / Snippet editor for power users */}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Raw XML Snippet
                </label>
                <textarea
                    value={customXml}
                    onChange={(e) => handleXmlChange(e.target.value)}
                    className="w-full h-48 p-3 bg-slate-900 text-green-400 font-mono text-xs rounded-lg border border-slate-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="<policy ... />"
                />
            </div>

            {Object.keys(properties).length === 0 && (
                <div className="text-center py-4">
                    <button
                        onClick={() => handlePropChange('new-attribute', 'value')}
                        className="text-xs text-blue-500 hover:underline"
                    >
                        + Add Property
                    </button>
                </div>
            )}
        </div>
    );
};
