
import React from 'react';
import {
    SortableContext,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { type PolicyStep, type PolicySection } from '../types';
import { POLICY_TEMPLATES } from '../templates';
import { GenericPolicyRenderer } from './GenericPolicyRenderer';

interface PolicyFlowListProps {
    section: PolicySection;
    steps: PolicyStep[];
    onAdd: (templateId: string) => void;
    onUpdate: (id: string, values: Record<string, any>) => void;
    onRemove: (id: string) => void;
    onReorder: (steps: PolicyStep[]) => void;
    readOnly?: boolean;
}

export const PolicyFlowList: React.FC<PolicyFlowListProps> = ({
    section,
    steps,
    onAdd,
    onUpdate,
    onRemove,
    readOnly
}) => {
    return (
        <div className="space-y-6">
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
                    {!readOnly && (
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    onAdd(e.target.value);
                                    e.target.value = ''; // Reset
                                }
                            }}
                            className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-purple-500 transition-all cursor-pointer"
                        >
                            <option value="">+ Add Policy</option>
                            {POLICY_TEMPLATES.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    {steps.map((step) => {
                        const template = POLICY_TEMPLATES.find(t => t.id === step.templateId);
                        if (!template) return null;

                        return (
                            <GenericPolicyRenderer
                                key={step.id}
                                id={step.id}
                                step={step}
                                onUpdate={onUpdate}
                                onRemove={onRemove}
                                readOnly={readOnly}
                            />
                        );
                    })}
                </SortableContext>

                {steps.length === 0 && (
                    <div className="border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] p-12 text-center">
                        <p className="text-xs font-bold text-slate-400">No {section} policies configured. Use dropdown or palette to add.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
