import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PolicyStep } from '../types/policyTypes';

interface PolicyStepCardProps {
    step: PolicyStep;
    index: number;
    isSelected: boolean;
    onClick: () => void;
    onDelete?: (id: string) => void;
    isReadOnly: boolean;
}

export const PolicyStepCard = ({ step, index, isSelected, onClick, onDelete, isReadOnly }: PolicyStepCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: step.id,
        data: {
            type: 'step',
            step
        },
        disabled: step.isLocked || isReadOnly
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onClick={onClick}
            className={`relative p-5 rounded-3xl border-2 flex items-center justify-between group transition-all cursor-pointer ${step.isLocked
                ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75 cursor-not-allowed'
                : isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-2xl ring-4 ring-blue-500/10 scale-[1.02] z-10'
                    : 'bg-white dark:bg-slate-800 border-white dark:border-slate-800 hover:border-blue-400 hover:shadow-xl'
                }`}
        >
            <div className="flex items-center gap-4 w-full">
                {/* Drag Handle or Locked Icon */}
                <div
                    {...listeners}
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${step.isLocked
                        ? 'bg-slate-200 dark:bg-slate-700'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 cursor-grab active:cursor-grabbing hover:bg-blue-200 dark:hover:bg-blue-800/50 transition'
                        }`}
                >
                    {step.isLocked ? '🔒' : (
                        // Six-dots drag handle icon
                        <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="font-black text-sm text-gray-900 dark:text-white truncate">{step.displayName}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <span>{step.scope}</span>
                        {!step.isLocked && <span className="w-1 h-1 rounded-full bg-gray-300"></span>}
                        {!step.isLocked && <span>Index: {index}</span>}
                    </div>
                </div>

                {/* Status Indicator / Delete Button */}
                {!step.isLocked && !isReadOnly && (
                    <div className="flex items-center">
                        {/* Show delete on hover, otherwise show indicator */}
                        <div className="hidden group-hover:block transition-all animate-in fade-in slide-in-from-right-4">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent card selection
                                    onDelete && onDelete(step.id);
                                }}
                                className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition"
                                title="Remove Policy"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                        <div className={`group-hover:hidden w-2 h-2 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                    </div>
                )}
            </div>
        </div>
    );
};
