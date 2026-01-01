import { PolicyTemplate, PolicyInput } from './policyTemplates';
import { PolicyCard } from './PolicyCard';

/**
 * Props for GenericPolicyRenderer
 * Strictly typed to ensure the form matches the JSON schema.
 */
interface GenericPolicyRendererProps {
    /** The JSON Template defining the form schema */
    template: PolicyTemplate;
    /** The current key-value state of the configuration */
    values: Record<string, unknown>;
    /** Callback when any field value changes */
    onChange: (validConfig: Record<string, unknown>) => void;
    /** Callback to remove this policy from the chain */
    onRemove?: () => void;
    /** CURRENT SECTION (Optional, enables Move functionality) */
    section?: 'inbound' | 'backend' | 'outbound' | 'on-error';
    /** Callback to move policy to another section */
    onSectionChange?: (newSection: 'inbound' | 'backend' | 'outbound' | 'on-error') => void;
    /** If true, disables all inputs and controls */
    readOnly?: boolean;
}

/**
 * GenericPolicyRenderer Component
 * 
 * The "Engine" of the Policy Studio.
 * Dynamically renders form inputs based on the `inputs` array in the Policy Template.
 * 
 * Supported Types:
 * - text: Simple input
 * - number: Numeric input
 * - boolean: Checkbox
 * - select: Dropdown
 * 
 * MFE Pattern: Fully stateless. Configuration is passed in via `values` prop.
 */
export const GenericPolicyRenderer = ({ template, values, onChange, onRemove, section, onSectionChange, readOnly }: GenericPolicyRendererProps) => {

    /**
     * Handles change for a single field, updating the global config object.
     */
    const handleFieldChange = (name: string, value: unknown) => {
        if (readOnly) return;
        const newValues = { ...values, [name]: value };
        onChange(newValues);
    };

    return (
        <PolicyCard template={template} onRemove={readOnly ? undefined : onRemove}>
            {/* Section Move Control (Contextual) */}
            {section && onSectionChange && !readOnly && (
                <div className="absolute top-4 right-10 z-10">
                    <select
                        value={section}
                        onChange={(e) => onSectionChange(e.target.value as 'inbound' | 'backend' | 'outbound' | 'on-error')}
                        className="bg-slate-100 dark:bg-slate-700 text-[9px] font-bold uppercase rounded px-2 py-1 border-none outline-none text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        title="Move Policy to Section"
                    >
                        <option value="inbound">Inbound</option>
                        <option value="backend">Backend</option>
                        <option value="outbound">Outbound</option>
                        <option value="on-error">On Error</option>
                    </select>
                </div>
            )}

            {/* Dynamic Form Generation */}
            <div className="grid grid-cols-2 gap-4 mt-2">
                {template.inputs.map((input: PolicyInput) => {
                    const isDisabled = readOnly;

                    // Render based on type
                    if (input.type === 'boolean') {
                        return (
                            <div key={input.name} className={`col-span-2 flex items-center gap-3 p-2 bg-white dark:bg-slate-800 rounded border border-slate-100 dark:border-slate-700 ${isDisabled ? 'opacity-60' : ''}`}>
                                <input
                                    type="checkbox"
                                    id={`${template.id}-${input.name}`}
                                    checked={!!values[input.name]} // Force boolean
                                    onChange={e => handleFieldChange(input.name, e.target.checked)}
                                    disabled={isDisabled}
                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 disabled:cursor-not-allowed"
                                />
                                <div>
                                    <label htmlFor={`${template.id}-${input.name}`} className={`text-xs font-bold text-slate-700 dark:text-slate-300 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        {input.label}
                                    </label>
                                    {input.helperText && <p className="text-[9px] text-slate-400">{input.helperText}</p>}
                                </div>
                            </div>
                        );
                    }

                    if (input.type === 'select') {
                        return (
                            <div key={input.name} className={`col-span-1 ${isDisabled ? 'opacity-60' : ''}`}>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                    {input.label}
                                </label>
                                <select
                                    value={(values[input.name] as string | number) || input.default || ''}
                                    onChange={e => handleFieldChange(input.name, e.target.value)}
                                    disabled={isDisabled}
                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500 transition-colors disabled:bg-slate-50 disabled:cursor-not-allowed"
                                >
                                    {input.options?.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        );
                    }

                    // Textarea (Custom XML / Scripts)
                    if (input.type === 'textarea') {
                        return (
                            <div key={input.name} className={`col-span-2 ${isDisabled ? 'opacity-60' : ''}`}>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                    {input.label}
                                </label>
                                <textarea
                                    value={(values[input.name] as string) || ''}
                                    onChange={e => handleFieldChange(input.name, e.target.value)}
                                    rows={6}
                                    disabled={isDisabled}
                                    className="w-full bg-slate-900 text-slate-100 font-mono text-[10px] border border-slate-700 rounded-lg px-3 py-2 outline-none focus:border-purple-500 transition-colors resize-y leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder={input.placeholder}
                                />
                            </div>
                        );
                    }

                    // Default: Text / Number
                    return (
                        <div key={input.name} className={`col-span-1 ${isDisabled ? 'opacity-60' : ''}`}>
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                                {input.label}
                            </label>
                            <input
                                type={input.type}
                                placeholder={input.placeholder}
                                value={(values[input.name] as string | number) || ''}
                                onChange={e => handleFieldChange(input.name, input.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                disabled={isDisabled}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500 transition-colors placeholder:text-slate-300 font-mono disabled:bg-slate-50 disabled:cursor-not-allowed"
                            />
                        </div>
                    );
                })}
            </div>
        </PolicyCard>
    );
};
