import React from 'react';
import type { PolicyStep } from '../types/policyTypes';

export interface PolicyStepCardProps {
    step: PolicyStep;
    onRemove?: () => void;
    onDuplicate?: () => void;
    onDelete?: (stepId: string) => void;
    isActive?: boolean;
    onClick?: () => void;
    index?: number;
    isReadOnly?: boolean;
    isSelected?: boolean;
}

export const PolicyStepCard: React.FC<PolicyStepCardProps> = ({
    step,
    onDelete,
    isActive,
    onClick,
    index,
    isReadOnly,
    isSelected
}) => {
    return (
        <div
            onClick={onClick}
            className={`p-6 bg-white dark:bg-slate-900 border-2 rounded-2xl cursor-pointer transition-all ${isActive || isSelected ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-50 dark:border-slate-800 hover:border-gray-200'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">{step.type}</p>
                {!isReadOnly && onDelete && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(step.id); }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                        ✕
                    </button>
                )}
            </div>
            <p className="font-bold text-gray-900 dark:text-white capitalize">{step.type.replace(/-/g, ' ')}</p>
            {index !== undefined && <p className="text-[10px] text-gray-400 mt-2 font-mono">STEP {index + 1}</p>}
        </div>
    );
};
