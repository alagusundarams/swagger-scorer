
import React from 'react';
import {
    SortableContext,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { type PolicyStep, type PolicySection } from '../types';
import { GenericPolicyRenderer } from './GenericPolicyRenderer';
import { useStore } from '../../../../store/useStore';

interface PolicyFlowListProps {
    section: PolicySection;
    steps: PolicyStep[];
    isActive: boolean;
    onActivate: () => void;
    onAdd: (templateId: string) => void;
    onUpdate: (id: string, values: Record<string, any>) => void;
    onRemove: (id: string) => void;
    onReorder: (steps: PolicyStep[]) => void;
    readOnly?: boolean;
}

export const PolicyFlowList: React.FC<PolicyFlowListProps> = ({
    section,
    steps,
    isActive,
    onActivate,
    onUpdate,
    onRemove,
    readOnly
}) => {
    const { policyTemplates } = useStore();

    const sectionColors: Record<PolicySection, string> = {
        'inbound': 'indigo',
        'backend': 'amber',
        'outbound': 'pink',
        'on-error': 'red'
    };

    const color = sectionColors[section];

    return (
        <div className={`space-y-6 p-4 rounded-[2.5rem] transition-all duration-500 border-2 ${isActive
            ? `bg-${color}-50/50 dark:bg-${color}-900/10 border-${color}-500/50 shadow-2xl shadow-${color}-500/10 ring-4 ring-${color}-500/5`
            : 'bg-transparent border-transparent'
            }`}>
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black uppercase text-white shadow-lg ${section === 'inbound' ? 'bg-indigo-500 shadow-indigo-500/20' :
                        section === 'outbound' ? 'bg-pink-500 shadow-pink-500/20' :
                            section === 'backend' ? 'bg-amber-500 shadow-amber-500/20' :
                                'bg-red-500 shadow-red-500/20'
                        }`}>
                        {section[0]}
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">
                            {section} Policies
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Execution Order: TOP TO BOTTOM
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {!readOnly && !isActive && (
                        <button
                            onClick={onActivate}
                            className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 hover:bg-white dark:hover:bg-slate-700 hover:text-purple-600 transition-all shadow-sm"
                        >
                            Configure Section
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {steps.map((step) => {
                        const template = policyTemplates.find(t => t.id === step.templateId);
                        if (!template) return null;

                        return (
                            <GenericPolicyRenderer
                                key={step.id}
                                id={step.id}
                                step={step}
                                template={template}
                                onUpdate={onUpdate}
                                onRemove={onRemove}
                                readOnly={readOnly}
                            />
                        );
                    })}
                </SortableContext>

                {steps.length === 0 && (
                    <button
                        onClick={onActivate}
                        disabled={readOnly}
                        className={`w-full border-2 border-dashed rounded-[2.5rem] p-16 text-center transition-all ${isActive
                            ? `border-${color}-400 bg-${color}-500/5 scale-[0.99] shadow-inner`
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center text-xl shadow-sm border ${isActive ? `bg-${color}-500 text-white border-${color}-600` : 'bg-white dark:bg-slate-800 text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}>
                            {isActive ? '⚡' : '＋'}
                        </div>
                        <p className={`text-xs font-black uppercase tracking-widest ${isActive ? `text-${color}-600 dark:text-${color}-400` : 'text-slate-400'}`}>
                            {isActive ? 'Ready to Add Policies' : `Click to Configure ${section}`}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 opacity-60">
                            {isActive ? 'Select a tile from the palette on the right' : 'Use the palette logic builder'}
                        </p>
                    </button>
                )}
            </div>
        </div>
    );
};
