
import React from 'react';

import { useStore } from '../../../../store/useStore';

interface PolicyPaletteProps {
    activeSection: string;
    onSectionChange: (section: string) => void;
    onSelect: (templateId: string) => void;
    readOnly?: boolean;
}

export const PolicyPalette: React.FC<PolicyPaletteProps> = ({
    activeSection,
    onSectionChange,
    onSelect,
    readOnly
}) => {
    const { policyTemplates } = useStore();
    const categories = Array.from(new Set(policyTemplates.map(t => t.category)));
    const sections = [
        { id: 'inbound', label: 'Inbound', color: 'indigo' },
        { id: 'backend', label: 'Backend', color: 'amber' },
        { id: 'outbound', label: 'Outbound', color: 'pink' },
        { id: 'on-error', label: 'Error', color: 'red' }
    ];

    return (
        <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-2xl z-20">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Policy Palette</h3>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Add logic to your API</p>
            </div>

            {/* Section Selector */}
            <div className="p-4 grid grid-cols-2 gap-2 border-b border-slate-100 dark:border-slate-800">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => onSectionChange(s.id)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all flex flex-col items-center justify-center gap-1 border ${activeSection === s.id
                            ? `bg-${s.color}-500 text-white border-${s.color}-600 shadow-lg shadow-${s.color}-500/20`
                            : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                    >
                        <span>{s.label}</span>
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
                {categories.map(cat => (
                    <div key={cat} className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">{cat}</p>
                        <div className="space-y-2">
                            {policyTemplates.filter(t => t.category === cat).map(template => (
                                <button
                                    key={template.id}
                                    disabled={readOnly}
                                    onClick={() => onSelect(template.id)}
                                    className="w-full text-left p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 hover:border-purple-200 dark:hover:border-purple-900/40 hover:bg-white dark:hover:bg-slate-800 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-[11px] font-black tracking-tight group-hover:text-purple-600 transition-colors uppercase">{template.name}</p>
                                        <span className="text-lg opacity-40 group-hover:opacity-100 transition-opacity">＋</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 line-clamp-2 leading-relaxed">
                                        {template.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
