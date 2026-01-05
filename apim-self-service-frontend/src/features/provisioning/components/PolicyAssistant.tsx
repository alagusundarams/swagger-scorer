import { useState, useMemo } from 'react';
import { PolicyTemplate } from './policyTemplates';
import { useStore } from '../../../store/useStore';

/**
 * ------------------------------------------------------------------
 * 📍 Component: PolicyAssistant
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Provides JIT (Just-In-Time) documentation for the selected policy template.
 * - Displays the XML signature and usage guidelines for developers.
 * - Helps users understand the "Intent" of a policy before applying it.
 * 
 * 📥 DATA INFLOW:
 * - `template`: The active template being viewed or configured.
 * ------------------------------------------------------------------
 */
/**
 * Props for the PolicyAssistant Component.
 * Follows Strict MFE Pattern: No internal store dependencies.
 */
interface PolicyAssistantProps {
    /** Callback when a user selects a template to apply */
    onSelectTemplate: (template: PolicyTemplate) => void;
    /** Optional class name for styling */
    className?: string;
}

/**
 * PolicyAssistant Component
 * 
 * Acts as a "Smart Agent" interface for the Policy Studio.
 * Instead of browsing a technical catalog, users search by "Intent" (e.g., "I want to block IPs").
 * 
 * Architecture:
 * - Pure Function of (Props) -> UI
 * - Filters local `POLICY_TEMPLATES` registry based on search term.
 * - Matches against both `name` and `intent` fields for better recall.
 */
export const PolicyAssistant = ({ onSelectTemplate, className = '' }: PolicyAssistantProps) => {
    const { policyTemplates } = useStore();
    const [searchTerm, setSearchTerm] = useState('');

    // Filter logic: Match name OR intent description
    const matches = useMemo(() => {
        if (!searchTerm) return policyTemplates; // Show all by default

        const lower = searchTerm.toLowerCase();
        return policyTemplates.filter(t =>
            t.name.toLowerCase().includes(lower) ||
            t.intent.toLowerCase().includes(lower) ||
            t.category.toLowerCase().includes(lower)
        );
    }, [searchTerm]);

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 ${className}`}>
            {/* Search / Intent Input */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">
                    What do you want to do?
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
                    <input
                        type="text"
                        placeholder="e.g. 'limit calls', 'change header'..."
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-8 pr-4 text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                {matches.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <p className="text-xs">No policies found matching "{searchTerm}"</p>
                    </div>
                ) : (
                    matches.map(template => (
                        <button
                            key={template.id}
                            onClick={() => onSelectTemplate(template)}
                            className="w-full text-left p-3 rounded-xl border border-transparent hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50 dark:hover:bg-slate-800 transition-all group relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${template.category === 'Traffic' ? 'bg-amber-100 text-amber-700' :
                                    template.category === 'Security' ? 'bg-red-100 text-red-700' :
                                        template.category === 'Mocking' ? 'bg-green-100 text-green-700' :
                                            'bg-blue-100 text-blue-700'
                                    }`}>
                                    {template.category}
                                </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-0.5 group-hover:text-purple-600 transition-colors">
                                {template.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 group-hover:text-slate-500 leading-tight">
                                {template.intent}
                            </p>
                        </button>
                    ))
                )}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-[10px] text-slate-400">
                    Can't find what you need? <button className="text-purple-500 font-bold hover:underline">Ask Super User</button>
                </p>
            </div>
        </div>
    );
};
