import { useState } from 'react';
import { type PolicyStep } from '../types';
import { PolicyTemplate, getPolicyFields } from '../../../../features/provisioning/components/policyTemplates';
import { PolicyCard } from './PolicyCard';

const SnippetButton = ({ onSelect, disabled }: { onSelect: (val: string) => void, disabled?: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const snippets = [
        { label: 'Backend URL', value: '{{BACKEND_URL}}', icon: '🔗' },
        { label: 'App Client ID', value: '{{IDENTITY_CLIENT_ID}}', icon: '🆔' },
        { label: 'App Secret', value: '{{IDENTITY_CLIENT_SECRET}}', icon: '🔑' },
        { label: 'API Key (Sub)', value: '{{API_KEY}}', icon: '🛡️' },
        { label: 'Auth Token (OBO)', value: '{{OBO_TOKEN}}', icon: '👤' },
        { label: 'Timeout', value: '{{GLOBAL_TIMEOUT}}', icon: '⏱️' }
    ];

    if (disabled) return null;

    return (
        <div className="relative inline-block ml-2">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-[9px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full border border-purple-100 dark:border-purple-800 hover:bg-purple-100 transition-all flex items-center gap-1"
                title="Insert dynamic snippet"
            >
                <span>⚡ Snippets</span>
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-2xl z-[70] p-2 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-2 border-b border-gray-50 dark:border-slate-700 mb-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Policy Variables</p>
                        </div>
                        {snippets.map(s => (
                            <button
                                key={s.value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(s.value);
                                    setIsOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 rounded-lg transition-colors flex items-center gap-3"
                            >
                                <span className="text-sm">{s.icon}</span>
                                <span className="flex-1">{s.label}</span>
                                <code className="text-[9px] font-mono text-slate-400 opacity-60 bg-gray-50 dark:bg-black/20 px-1 rounded">{s.value}</code>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

interface GenericPolicyRendererProps {
    id: string;
    step: PolicyStep;
    template: PolicyTemplate;
    onUpdate: (id: string, updates: Record<string, any>) => void;
    onRemove: (id: string) => void;
    readOnly?: boolean;
}

export const GenericPolicyRenderer = ({
    id,
    step,
    template,
    onUpdate,
    onRemove,
    readOnly = false
}: GenericPolicyRendererProps) => {
    if (!template) {
        return (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-bold">
                Unknown Policy Template: {step.templateId}
            </div>
        );
    }

    const handleFieldChange = (name: string, value: any) => {
        onUpdate(id, { ...step.values, [name]: value });
    };

    return (
        <PolicyCard
            id={id}
            onRemove={() => onRemove(id)}
            readOnly={readOnly}
        >
            <div className="mb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{template.name}</h3>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium mt-1">{template.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 animate-in fade-in slide-in-from-top-2 duration-500 text-left">
                {getPolicyFields(template).map(input => (
                    <div key={input.name} className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center">
                            <span>{input.label}</span>
                            {(!input.type || input.type === 'text' || input.type === 'textarea') && (
                                <SnippetButton
                                    disabled={readOnly}
                                    onSelect={(snippet) => {
                                        const currentVal = step.values[input.name] || '';
                                        handleFieldChange(input.name, `${currentVal}${snippet}`);
                                    }}
                                />
                            )}
                            <div className="flex-1" />
                            {input.placeholder && (
                                <span className="normal-case font-normal text-slate-300 dark:text-slate-600 italic">e.g. {input.placeholder}</span>
                            )}
                        </label>

                        {input.type === 'boolean' ? (
                            <div
                                onClick={() => !readOnly && handleFieldChange(input.name, !step.values[input.name])}
                                className={`h-11 px-4 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${step.values[input.name]
                                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400'
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
                                    } ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                            >
                                <span className="text-xs font-bold uppercase tracking-tight">{step.values[input.name] ? 'Enabled' : 'Disabled'}</span>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${step.values[input.name] ? 'bg-purple-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${step.values[input.name] ? 'left-4.5' : 'left-0.5'}`} />
                                </div>
                            </div>
                        ) : input.type === 'select' ? (
                            <select
                                value={step.values[input.name] || ''}
                                onChange={(e) => handleFieldChange(input.name, e.target.value)}
                                disabled={readOnly}
                                className="w-full h-11 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none appearance-none cursor-pointer disabled:opacity-50"
                            >
                                <option value="">Select Option</option>
                                {input.options?.map(opt => {
                                    const value = typeof opt === 'string' ? opt : opt.value;
                                    const label = typeof opt === 'string' ? opt : opt.label;
                                    return <option key={value} value={value}>{label}</option>;
                                })}
                            </select>
                        ) : input.type === 'textarea' ? (
                            <textarea
                                value={step.values[input.name] || ''}
                                onChange={(e) => handleFieldChange(input.name, e.target.value)}
                                placeholder={input.placeholder}
                                disabled={readOnly}
                                rows={3}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none resize-none disabled:opacity-50"
                            />
                        ) : (
                            <input
                                type={input.type || 'text'}
                                value={step.values[input.name] || ''}
                                onChange={(e) => handleFieldChange(input.name, input.type === 'number' ? Number(e.target.value) : e.target.value)}
                                placeholder={input.placeholder}
                                disabled={readOnly}
                                className="w-full h-11 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all outline-none disabled:opacity-50"
                            />
                        )}
                    </div>
                ))}
            </div>
        </PolicyCard>
    );
};
