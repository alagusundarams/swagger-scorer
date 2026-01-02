
import React from 'react';
import { type PolicyTemplate } from '../types';
import { POLICY_TEMPLATES } from '../templates';

interface PolicyPaletteProps {
    onSelect: (template: PolicyTemplate) => void;
    readOnly?: boolean;
}

export const PolicyPalette: React.FC<PolicyPaletteProps> = ({ onSelect, readOnly }) => {
    const categories = Array.from(new Set(POLICY_TEMPLATES.map(t => t.category)));

    return (
        <div className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-2xl z-20">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Policy Palette</h3>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Add logic to your API</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
                {categories.map(cat => (
                    <div key={cat} className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">{cat}</p>
                        <div className="space-y-2">
                            {POLICY_TEMPLATES.filter(t => t.category === cat).map(template => (
                                <button
                                    key={template.id}
                                    disabled={readOnly}
                                    onClick={() => onSelect(template)}
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
