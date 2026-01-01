import type { PolicyStep } from '../../types/policyTypes';

/**
 * ------------------------------------------------------------------
 * 📍 Component: CustomXmlProperties
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Expert-mode override for a single policy step.
 * - Provides a Monaco editor instance for editing raw XML snippets.
 * - Used for policies that don't have a structured JSON template.
 * ------------------------------------------------------------------
 */
interface CustomXmlPropertiesProps {
    step: PolicyStep;
    onChange: (updates: Partial<PolicyStep>) => void;
    isReadOnly?: boolean;
}

export const CustomXmlProperties: React.FC<CustomXmlPropertiesProps> = ({ step, onChange, isReadOnly }) => {
    return (
        <div className="space-y-4">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">XML Content</label>
            <textarea
                value={step.properties?.xml || ''}
                onChange={(e) => onChange({ properties: { ...step.properties, xml: e.target.value } })}
                readOnly={isReadOnly}
                className="w-full h-64 p-4 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="<policy>...</policy>"
            />
        </div>
    );
};
